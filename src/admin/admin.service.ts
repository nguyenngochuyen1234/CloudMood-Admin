import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../upload/r2.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  private mapEmojiPairConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Each emoji_type can only have one emoji for each emotion',
      );
    }

    throw error;
  }

  private async deleteConflictingEmojiByPair(
    tx: Prisma.TransactionClient,
    typeId: bigint,
    emotionId: bigint,
    excludeId?: bigint,
  ): Promise<string | null> {
    const conflictingEmoji = await tx.emoji.findFirst({
      where: {
        typeId,
        emotionId,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!conflictingEmoji) {
      return null;
    }

    await tx.emoji.delete({ where: { id: conflictingEmoji.id } });
    return conflictingEmoji.imageUrl;
  }

  private async deleteEmojiImageIfNeeded(
    imageUrl: string | null,
    preservedImageUrl?: string,
  ) {
    if (!imageUrl || imageUrl === preservedImageUrl) {
      return;
    }

    try {
      await this.r2.deleteByUrl(imageUrl);
    } catch (error) {
      this.logger.error(
        `Failed to delete replaced emoji image from R2: ${imageUrl}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  // ==================== USERS ====================
  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUserRole(id: string, role: string) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  // ==================== EMOTIONS ====================
  async getEmotions() {
    return this.prisma.emotion.findMany({ orderBy: { id: 'asc' } });
  }

  async createEmotion(data: {
    id: bigint;
    nameEn: string;
    nameVi: string;
    descriptionEn?: string;
    descriptionVi?: string;
    color?: string;
    score?: number;
    isPro?: boolean;
  }) {
    return this.prisma.emotion.create({ data });
  }

  async updateEmotion(
    id: bigint,
    data: {
      nameEn?: string;
      nameVi?: string;
      descriptionEn?: string;
      descriptionVi?: string;
      color?: string;
      score?: number;
      isPro?: boolean;
    },
  ) {
    const existing = await this.prisma.emotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emotion not found');
    return this.prisma.emotion.update({ where: { id }, data });
  }

  async deleteEmotion(id: bigint) {
    const existing = await this.prisma.emotion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emotion not found');
    return this.prisma.emotion.delete({ where: { id } });
  }

  // ==================== EMOJI TYPES ====================
  async getEmojiTypes() {
    return this.prisma.emojiType.findMany({ orderBy: { id: 'asc' } });
  }

  async createEmojiType(data: {
    id: bigint;
    nameEn: string;
    nameVi: string;
    descriptionEn?: string;
    descriptionVi?: string;
    isActive?: boolean;
    isPro?: boolean;
  }) {
    return this.prisma.emojiType.create({ data });
  }

  async updateEmojiType(id: bigint, data: Partial<{ nameEn: string; nameVi: string; descriptionEn: string; descriptionVi: string; isActive: boolean; isPro: boolean }>) {
    const existing = await this.prisma.emojiType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('EmojiType not found');
    return this.prisma.emojiType.update({ where: { id }, data });
  }

  async deleteEmojiType(id: bigint) {
    const existing = await this.prisma.emojiType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('EmojiType not found');
    return this.prisma.emojiType.delete({ where: { id } });
  }

  // ==================== EMOJIS ====================
  async getEmojis(typeId?: bigint) {
    return this.prisma.emoji.findMany({
      where: typeId ? { typeId } : undefined,
      include: { type: true, emotion: true },
      orderBy: { id: 'asc' },
    });
  }

  async createEmoji(data: { id: bigint; imageUrl: string; typeId: bigint; emotionId: bigint }) {
    try {
      let replacedEmojiImageUrl: string | null = null;

      const createdEmoji = await this.prisma.$transaction(async tx => {
        replacedEmojiImageUrl = await this.deleteConflictingEmojiByPair(
          tx,
          data.typeId,
          data.emotionId,
        );

        return tx.emoji.create({ data });
      });

      await this.deleteEmojiImageIfNeeded(
        replacedEmojiImageUrl,
        data.imageUrl,
      );

      return createdEmoji;
    } catch (error) {
      this.mapEmojiPairConflict(error);
    }
  }

  async updateEmoji(id: bigint, data: Partial<{ imageUrl: string; typeId: bigint; emotionId: bigint }>) {
    const existing = await this.prisma.emoji.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emoji not found');

    const nextTypeId = data.typeId ?? existing.typeId;
    const nextEmotionId = data.emotionId ?? existing.emotionId;
    const finalImageUrl = data.imageUrl ?? existing.imageUrl;

    try {
      let replacedEmojiImageUrl: string | null = null;

      const updatedEmoji = await this.prisma.$transaction(async tx => {
        replacedEmojiImageUrl = await this.deleteConflictingEmojiByPair(
          tx,
          nextTypeId,
          nextEmotionId,
          id,
        );

        return tx.emoji.update({ where: { id }, data });
      });

      await this.deleteEmojiImageIfNeeded(replacedEmojiImageUrl, finalImageUrl);

      return updatedEmoji;
    } catch (error) {
      this.mapEmojiPairConflict(error);
    }
  }

  async deleteEmoji(id: bigint) {
    const existing = await this.prisma.emoji.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Emoji not found');
    return this.prisma.emoji.delete({ where: { id } });
  }

  async bulkCreateEmojis(emojis: Array<{ id: number; imageUrl: string; typeId: number; emotionId: number }>) {
    try {
      return await this.prisma.$transaction(
        emojis.map(item =>
          this.prisma.emoji.create({
            data: {
              id: BigInt(item.id),
              imageUrl: item.imageUrl,
              typeId: BigInt(item.typeId),
              emotionId: BigInt(item.emotionId),
            },
          }),
        ),
      );
    } catch (error) {
      this.mapEmojiPairConflict(error);
    }
  }

  // ==================== THEMES ====================
  async getThemes() {
    return this.prisma.theme.findMany({
      include: { themeImages: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTheme(data: {
    name: string;
    mode?: string;
    isActive?: boolean;
    isPro?: boolean;
    colorsJson: object;
  }) {
    return this.prisma.theme.create({ data: { ...data, colorsJson: data.colorsJson as any } });
  }

  async updateTheme(id: string, data: Partial<{ name: string; mode: string; isActive: boolean; isPro: boolean; colorsJson: object }>) {
    const existing = await this.prisma.theme.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Theme not found');
    return this.prisma.theme.update({ where: { id }, data: { ...data, colorsJson: data.colorsJson as any } });
  }

  async deleteTheme(id: string) {
    const existing = await this.prisma.theme.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Theme not found');
    return this.prisma.theme.delete({ where: { id } });
  }

  // ==================== EVENTS ====================
  async getEvents() {
    return this.prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createEvent(data: {
    name: string;
    imageUrl?: string;
    color?: string;
    backgroundColor?: string;
    descriptionEn?: string;
    descriptionVi?: string;
  }) {
    return this.prisma.event.create({ data });
  }

  async updateEvent(id: string, data: Partial<{ name: string; imageUrl: string; color: string; backgroundColor: string; descriptionEn: string; descriptionVi: string }>) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    return this.prisma.event.update({ where: { id }, data });
  }

  async deleteEvent(id: string) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Event not found');
    return this.prisma.event.delete({ where: { id } });
  }

  // ==================== THEME IMAGES ====================
  async createThemeImage(data: { themeId: string; type: string; imageUrl: string }) {
    return this.prisma.themeImage.create({ data });
  }

  async deleteThemeImage(id: string) {
    const existing = await this.prisma.themeImage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ThemeImage not found');
    return this.prisma.themeImage.delete({ where: { id } });
  }

  // ==================== DASHBOARD ====================
  async getDashboardStats() {
    const [totalUsers, totalEmotions, totalThemes, totalEvents] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.emotion.count(),
        this.prisma.theme.count(),
        this.prisma.event.count(),
      ]);
    return { totalUsers, totalEmotions, totalThemes, totalEvents };
  }
}
