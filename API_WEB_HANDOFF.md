# CloudMood Backend API Handoff

## Base URL

- Local: `http://localhost:3001`
- Port lấy từ biến môi trường `PORT`, mặc định là `3001`

## Auth

- Đăng nhập qua `POST /auth/login`
- Các API ghi dữ liệu admin cần header:

```http
Authorization: Bearer <accessToken>
```

- Token hợp lệ nhưng user không có role `ADMIN` sẽ nhận `403 Admin access only`

## Luu y

- CORS đang bật
- `BigInt` được serialize thành `string` trong JSON, nên các id kiểu bigint như emotion/emoji/type có thể trả về dạng chuỗi
- Module `moods` va `analytics` da bi xoa hoan toan

## Public APIs

### 1. Health Check

`GET /`

Response:

```json
"Hello World!"
```

### 2. Register User

`POST /auth/register`

Body:

```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "User Name"
}
```

Rules:

- `email` bat buoc, dung dinh dang email
- `password` bat buoc, toi thieu 6 ky tu
- `name` khong bat buoc

Response:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "createdAt": "2026-06-10T15:00:00.000Z",
  "updatedAt": "2026-06-10T15:00:00.000Z"
}
```

### 3. Login

`POST /auth/login`

Body:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Response:

```json
{
  "accessToken": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "ADMIN"
  }
}
```

## Public Admin Read APIs

Tat ca API `GET /admin/*` hien dang public, khong can login.

### 4. Dashboard

`GET /admin/dashboard`

Response:

```json
{
  "totalUsers": 10,
  "totalEmotions": 25,
  "totalThemes": 8,
  "totalEvents": 12
}
```

### 5. Users

`GET /admin/users`

Response item:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "USER",
  "createdAt": "2026-06-10T15:00:00.000Z"
}
```

### 6. Emotions

`GET /admin/emotions`

Response item:

```json
{
  "id": "1",
  "nameEn": "Happy",
  "nameVi": "Vui",
  "descriptionEn": "Feeling good",
  "descriptionVi": "Cam thay vui",
  "color": "#FFD54F",
  "score": 5,
  "isPro": false,
  "createdAt": "2026-06-10T15:00:00.000Z"
}
```

### 7. Emoji Types

`GET /admin/emoji-types`

Response item:

```json
{
  "id": "1",
  "nameEn": "Smile",
  "nameVi": "Cuoi",
  "descriptionEn": "Smile emojis",
  "descriptionVi": "Emoji cuoi",
  "isActive": true,
  "isPro": false,
  "createdAt": "2026-06-10T15:00:00.000Z"
}
```

### 8. Emojis

`GET /admin/emojis`

Query params:

- `typeId` optional, filter emojis by emoji type id

Response item:

```json
{
  "id": "1001",
  "imageUrl": "https://cdn.example.com/emojis/a.png",
  "typeId": "1",
  "emotionId": "1",
  "createdAt": "2026-06-10T15:00:00.000Z",
  "type": {
    "id": "1",
    "nameEn": "Smile",
    "nameVi": "Cuoi"
  },
  "emotion": {
    "id": "1",
    "nameEn": "Happy",
    "nameVi": "Vui"
  }
}
```

### 9. Themes

`GET /admin/themes`

Response item:

```json
{
  "id": "uuid",
  "name": "Sunrise",
  "mode": "light",
  "isActive": true,
  "isPro": false,
  "colorsJson": {
    "primary": "#FF8A65",
    "background": "#FFF3E0"
  },
  "createdAt": "2026-06-10T15:00:00.000Z",
  "themeImages": [
    {
      "id": "uuid",
      "themeId": "uuid",
      "type": "background",
      "imageUrl": "https://cdn.example.com/themes/bg.png",
      "createdAt": "2026-06-10T15:00:00.000Z"
    }
  ]
}
```

### 10. Events

`GET /admin/events`

Response item:

```json
{
  "id": "uuid",
  "name": "New Year",
  "imageUrl": "https://cdn.example.com/events/new-year.png",
  "color": "#FF5252",
  "backgroundColor": "#FFF0F0",
  "descriptionEn": "New year event",
  "descriptionVi": "Su kien nam moi",
  "createdAt": "2026-06-10T15:00:00.000Z"
}
```

## Admin Write APIs

Tat ca API duoi day yeu cau:

- JWT hop le
- User role = `ADMIN`

### 11. Register Admin

`POST /auth/register-admin`

Body:

```json
{
  "email": "admin@example.com",
  "password": "123456",
  "name": "Admin Name"
}
```

Response giong `POST /auth/register`, nhung `role` se la `ADMIN`.

### 12. Update User Role

`PATCH /admin/users/:id/role`

Body:

```json
{
  "role": "ADMIN"
}
```

### 13. Create Emotion

`POST /admin/emotions`

Body:

```json
{
  "id": "1",
  "nameEn": "Happy",
  "nameVi": "Vui",
  "descriptionEn": "Feeling good",
  "descriptionVi": "Cam thay vui",
  "color": "#FFD54F",
  "score": 5,
  "isPro": false
}
```

### 14. Update Emotion

`PATCH /admin/emotions/:id`

Body: gui cac field can sua

```json
{
  "nameEn": "Very Happy",
  "score": 6
}
```

### 15. Delete Emotion

`DELETE /admin/emotions/:id`

### 16. Create Emoji Type

`POST /admin/emoji-types`

Body:

```json
{
  "id": "1",
  "nameEn": "Smile",
  "nameVi": "Cuoi",
  "descriptionEn": "Smile emojis",
  "descriptionVi": "Emoji cuoi",
  "isActive": true,
  "isPro": false
}
```

### 17. Update Emoji Type

`PATCH /admin/emoji-types/:id`

Body: gui cac field can sua

### 18. Delete Emoji Type

`DELETE /admin/emoji-types/:id`

### 19. Upload Image

`POST /admin/upload?folder=emojis`

Request:

- `multipart/form-data`
- field file: `file`
- chi nhan file co mime type `image/*`
- gioi han size: `5MB`
- `folder` chi nhan ky tu `a-z`, `A-Z`, `0-9`, `_`, `-`
- neu `folder` khong hop le, backend se dung `emojis`

Response:

```json
{
  "url": "https://cdn.example.com/emojis/1718012345-file.png"
}
```

### 20. Bulk Create Emojis

`POST /admin/emojis/bulk`

Note:

- moi cap `typeId` + `emotionId` chi duoc ton tai mot lan

Body:

```json
{
  "emojis": [
    {
      "id": 1001,
      "imageUrl": "https://cdn.example.com/emojis/a.png",
      "typeId": 1,
      "emotionId": 1
    }
  ]
}
```

### 21. Create Emoji

`POST /admin/emojis`

Note:

- neu cap `typeId` + `emotionId` da ton tai o emoji khac, backend se xoa bang ghi cu roi tao bang ghi moi
- neu anh cua bang ghi bi thay the nam tren R2 hien tai, backend se xoa anh do tren R2

Body:

```json
{
  "id": "1001",
  "imageUrl": "https://cdn.example.com/emojis/a.png",
  "typeId": "1",
  "emotionId": "1"
}
```

### 22. Update Emoji

`PATCH /admin/emojis/:id`

Note:

- neu cap `typeId` + `emotionId` da ton tai o emoji khac, backend se ghi de bang ghi do bang emoji dang update
- bang ghi emoji cu bi xoa khoi database
- neu anh cua bang ghi bi ghi de nam tren R2 hien tai, backend se xoa anh do tren R2

Body: gui cac field can sua

```json
{
  "imageUrl": "https://cdn.example.com/emojis/b.png",
  "typeId": "2",
  "emotionId": "3"
}
```

### 23. Delete Emoji

`DELETE /admin/emojis/:id`

### 24. Create Theme

`POST /admin/themes`

Body:

```json
{
  "name": "Sunrise",
  "mode": "light",
  "isActive": true,
  "isPro": false,
  "colorsJson": {
    "primary": "#FF8A65",
    "background": "#FFF3E0"
  }
}
```

### 25. Update Theme

`PATCH /admin/themes/:id`

Body: gui cac field can sua

### 26. Delete Theme

`DELETE /admin/themes/:id`

### 27. Create Theme Image

`POST /admin/theme-images`

Body:

```json
{
  "themeId": "uuid",
  "type": "background",
  "imageUrl": "https://cdn.example.com/themes/bg.png"
}
```

### 28. Delete Theme Image

`DELETE /admin/theme-images/:id`

### 29. Create Event

`POST /admin/events`

Body:

```json
{
  "name": "New Year",
  "imageUrl": "https://cdn.example.com/events/new-year.png",
  "color": "#FF5252",
  "backgroundColor": "#FFF0F0",
  "descriptionEn": "New year event",
  "descriptionVi": "Su kien nam moi"
}
```

### 30. Update Event

`PATCH /admin/events/:id`

Body: gui cac field can sua

### 31. Delete Event

`DELETE /admin/events/:id`

## Removed APIs

Khong con ton tai:

- `GET /moods`
- `GET /moods/:id`
- `POST /moods`
- `PATCH /moods/:id`
- `DELETE /moods/:id`
- `GET /analytics/summary`

## Error Cases Thuong Gap

- `401 Unauthorized`: thieu token hoac token khong hop le
- `403 Admin access only`: user khong phai admin
- `409 Email already registered`: email da ton tai
- `400 Bad Request`: body sai validate, upload sai file type, hoac file vuot qua `5MB`
