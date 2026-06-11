import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AdminService } from './admin.service';
import { R2Service } from '../upload/r2.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly r2: R2Service,
  ) {}

  // ==================== DASHBOARD ====================
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ==================== USERS ====================
  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateUserRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  // ==================== EMOTIONS ====================
  @Get('emotions')
  getEmotions() {
    return this.adminService.getEmotions();
  }

  @Post('emotions')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createEmotion(@Body() body: any) {
    return this.adminService.createEmotion({ ...body, id: BigInt(body.id) });
  }

  @Patch('emotions/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateEmotion(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.updateEmotion(BigInt(id), body);
  }

  @Delete('emotions/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteEmotion(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteEmotion(BigInt(id));
  }

  // ==================== EMOJI TYPES ====================
  @Get('emoji-types')
  getEmojiTypes() {
    return this.adminService.getEmojiTypes();
  }

  @Post('emoji-types')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createEmojiType(@Body() body: any) {
    return this.adminService.createEmojiType({ ...body, id: BigInt(body.id) });
  }

  @Patch('emoji-types/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateEmojiType(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.adminService.updateEmojiType(BigInt(id), body);
  }

  @Delete('emoji-types/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteEmojiType(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteEmojiType(BigInt(id));
  }

  // ==================== UPLOAD ====================
  @Post('upload')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Chỉ chấp nhận file ảnh'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder: string,
  ) {
    const safeFolder = /^[a-z0-9_-]+$/i.test(folder) ? folder : 'emojis';
    const url = await this.r2.upload(file.buffer, file.originalname, file.mimetype, safeFolder);
    return { url };
  }

  // ==================== EMOJIS ====================
  @Get('emojis')
  getEmojis(@Query('typeId') typeId?: string) {
    if (typeId === undefined) {
      return this.adminService.getEmojis();
    }

    const parsedTypeId = Number(typeId);
    if (!Number.isInteger(parsedTypeId) || parsedTypeId <= 0) {
      throw new BadRequestException('typeId must be a positive integer');
    }

    return this.adminService.getEmojis(BigInt(parsedTypeId));
  }

  @Post('emojis/bulk')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  bulkCreateEmojis(@Body() body: { emojis: any[] }) {
    return this.adminService.bulkCreateEmojis(body.emojis);
  }

  @Post('emojis')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createEmoji(@Body() body: any) {
    return this.adminService.createEmoji({
      ...body,
      id: BigInt(body.id),
      typeId: BigInt(body.typeId),
      emotionId: BigInt(body.emotionId),
    });
  }

  @Patch('emojis/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateEmoji(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const data: any = { ...body };
    if (body.typeId) data.typeId = BigInt(body.typeId);
    if (body.emotionId) data.emotionId = BigInt(body.emotionId);
    return this.adminService.updateEmoji(BigInt(id), data);
  }

  @Delete('emojis/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteEmoji(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteEmoji(BigInt(id));
  }

  // ==================== THEMES ====================
  @Get('themes')
  getThemes() {
    return this.adminService.getThemes();
  }

  @Post('themes')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createTheme(@Body() body: any) {
    return this.adminService.createTheme(body);
  }

  @Patch('themes/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateTheme(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateTheme(id, body);
  }

  @Delete('themes/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteTheme(@Param('id') id: string) {
    return this.adminService.deleteTheme(id);
  }

  // ==================== THEME IMAGES ====================
  @Post('theme-images')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createThemeImage(@Body() body: { themeId: string; type: string; imageUrl: string }) {
    return this.adminService.createThemeImage(body);
  }

  @Delete('theme-images/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteThemeImage(@Param('id') id: string) {
    return this.adminService.deleteThemeImage(id);
  }

  // ==================== EVENTS ====================
  @Get('events')
  getEvents() {
    return this.adminService.getEvents();
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  createEvent(@Body() body: any) {
    return this.adminService.createEvent(body);
  }

  @Patch('events/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  updateEvent(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateEvent(id, body);
  }

  @Delete('events/:id')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id);
  }
}
