# PRD: ระบบ Property Management System (PMS) พร้อม Direct Booking

---

## Problem Statement

ผู้ประกอบการโรงแรมขนาดเล็กถึงขนาดกลางไม่มีระบบจัดการการจองที่เป็นของตนเอง ทำให้ต้องพึ่งพา OTA (เช่น Airbnb, Booking.com) ซึ่งมีค่าคอมมิชชั่นสูง และไม่สามารถควบคุมประสบการณ์การจองของแขกได้โดยตรง นอกจากนี้การจัดการห้องพัก ราคารายคืน และข้อมูลการจองยังกระจัดกระจายอยู่ในหลายระบบ ทำให้เกิดความผิดพลาดในการดำเนินงาน

---

## Solution

สร้างระบบ PMS แบบ standalone ประกอบด้วย 2 ส่วนหลัก:

1. **Admin Dashboard** — แผงควบคุมสำหรับเจ้าหน้าที่โรงแรม ใช้จัดการห้องพัก ราคารายคืน และบริหารการจองครบวงจร
2. **Direct Booking Page** — หน้าจองสำหรับแขก ให้แขกสามารถเลือกวันที่ เลือกประเภทห้อง และชำระเงินผ่าน Stripe ได้ทันที

ระบบนี้เป็น **Turborepo monorepo** ที่แยกออกจาก FazWaz Laravel โดยสมบูรณ์ ประกอบด้วย:
- `apps/web` — Next.js (Frontend: Admin Dashboard + Direct Booking Page)
- `apps/api` — NestJS (Backend API)
- `packages/types` — Shared TypeScript types

---

## User Stories

### แขก (Guest)

1. ในฐานะแขก ฉันต้องการสมัครสมาชิกด้วยอีเมลและรหัสผ่าน เพื่อให้มีบัญชีในระบบ
2. ในฐานะแขก ฉันต้องการสมัครสมาชิกและเข้าสู่ระบบด้วย Google OAuth เพื่อความสะดวกและรวดเร็ว
3. ในฐานะแขก ฉันต้องการเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน เพื่อเข้าถึงประวัติการจองของฉัน
4. ในฐานะแขก ฉันต้องการดูหน้าการจอง (`/book`) เพื่อเริ่มกระบวนการจองห้องพัก
5. ในฐานะแขก ฉันต้องการเลือกวันเช็คอินและวันเช็คเอาต์บนปฏิทิน เพื่อระบุช่วงเวลาที่ต้องการเข้าพัก
6. ในฐานะแขก ฉันต้องการดูประเภทห้องพักที่มีอยู่พร้อมจำนวนผู้เข้าพักสูงสุดและราคารายคืน เพื่อเปรียบเทียบและเลือกห้องที่เหมาะสม
7. ในฐานะแขก ฉันต้องการเห็นว่าห้องพักประเภทใดไม่ว่างในช่วงวันที่เลือก เพื่อไม่ต้องเสียเวลาเลือกห้องที่จองไม่ได้
8. ในฐานะแขก ฉันต้องการดูยอดรวมราคาแบบแจกแจงรายคืนก่อนชำระเงิน เพื่อยืนยันความถูกต้องของราคา
9. ในฐานะแขก ฉันต้องการกรอกข้อมูลส่วนตัว (ชื่อ นามสกุล เบอร์โทร) ก่อนชำระเงิน เพื่อให้โรงแรมมีข้อมูลติดต่อ
10. ในฐานะแขก ฉันต้องการชำระเงินผ่าน Stripe Checkout เพื่อความปลอดภัยและความน่าเชื่อถือ
11. ในฐานะแขก ฉันต้องการได้รับอีเมลยืนยันการจองทันทีหลังชำระเงินสำเร็จ เพื่อเก็บไว้เป็นหลักฐาน
12. ในฐานะแขก ฉันต้องการดูหน้ายืนยันการจองหลังชำระเงินเสร็จสิ้น เพื่อทราบรายละเอียดการจองของฉัน
13. ในฐานะแขก ฉันต้องการดูประวัติการจองทั้งหมดของฉันในหน้า account เพื่อติดตามสถานะการจอง
14. ในฐานะแขก ฉันต้องการเห็นนโยบายไม่คืนเงินอย่างชัดเจนก่อนยืนยันการจอง เพื่อรับทราบข้อกำหนดก่อนชำระเงิน

### แอดมิน (Admin)

15. ในฐานะแอดมิน ฉันต้องการเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน เพื่อเข้าถึงแผงควบคุม
16. ในฐานะแอดมิน ฉันต้องการดูรายการการจองทั้งหมดในแผงควบคุม เพื่อภาพรวมของการดำเนินงาน
17. ในฐานะแอดมิน ฉันต้องการกรองการจองตามสถานะ (pending, confirmed, cancelled) เพื่อจัดการได้อย่างมีประสิทธิภาพ
18. ในฐานะแอดมิน ฉันต้องการกรองการจองตามช่วงวันที่เช็คอิน เพื่อวางแผนการดำเนินงานรายวัน
19. ในฐานะแอดมิน ฉันต้องการดูรายละเอียดการจองแต่ละรายการ (ข้อมูลแขก วันที่ ห้อง ราคา สถานะการชำระเงิน) เพื่อให้บริการแขกได้ถูกต้อง
20. ในฐานะแอดมิน ฉันต้องการสร้างการจองด้วยตนเอง (walk-in / phone booking) เพื่อรองรับการจองที่ไม่ผ่านระบบออนไลน์
21. ในฐานะแอดมิน ฉันต้องการแก้ไขวันเช็คอิน/เช็คเอาต์ของการจองที่มีอยู่ เพื่อรองรับการเปลี่ยนแปลงจากแขก
22. ในฐานะแอดมิน ฉันต้องการเปลี่ยนประเภทห้องของการจองที่มีอยู่ เพื่อยืดหยุ่นในการรองรับความต้องการของแขก
23. ในฐานะแอดมิน ฉันต้องการยกเลิกการจอง เพื่อปลดล็อกห้องพักกลับสู่ inventory
24. ในฐานะแอดมิน ฉันต้องการทำเครื่องหมายการจองว่า "ชำระเงินแล้ว" (สำหรับการจองที่ชำระเงินนอกระบบ) เพื่อให้ข้อมูลการจองถูกต้อง
25. ในฐานะแอดมิน ฉันต้องการได้รับอีเมลแจ้งเตือนทุกครั้งที่มีการจองใหม่ เพื่อรับทราบทันที
26. ในฐานะแอดมิน ฉันต้องการจัดการประเภทห้องพัก (สร้าง แก้ไข ลบ) เพื่อให้ข้อมูลห้องพักเป็นปัจจุบัน
27. ในฐานะแอดมิน ฉันต้องการกำหนดจำนวนห้องต่อประเภท เพื่อควบคุม inventory ได้อย่างถูกต้อง
28. ในฐานะแอดมิน ฉันต้องการกำหนดจำนวนผู้เข้าพักสูงสุดต่อประเภทห้อง เพื่อแสดงข้อมูลที่ถูกต้องให้แขก
29. ในฐานะแอดมิน ฉันต้องการอัปโหลดรูปภาพและคำอธิบายสำหรับแต่ละประเภทห้อง เพื่อให้แขกตัดสินใจได้ง่ายขึ้น
30. ในฐานะแอดมิน ฉันต้องการกำหนดราคารายคืนสำหรับแต่ละวันในปฏิทินต่อประเภทห้อง เพื่อควบคุมรายได้ได้อย่างยืดหยุ่น
31. ในฐานะแอดมิน ฉันต้องการกำหนดราคาเป็น range วันที่ได้ (เช่น วันที่ 1-15 มกราคม ราคา 2,000 บาท) เพื่อความสะดวกในการตั้งราคาช่วงเวลายาว
32. ในฐานะแอดมิน ฉันต้องการดูปฏิทินที่แสดงราคาและสถานะ availability รายวันต่อประเภทห้อง เพื่อภาพรวมของ inventory

---

## Implementation Decisions

### Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo |
| Frontend | Next.js (App Router) |
| Backend | NestJS |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | NextAuth.js v5 |
| Payment | Stripe |
| Email | Resend หรือ SendGrid |
| Shared Types | `packages/types` (TypeScript) |

### โครงสร้าง Monorepo

```
pms/
├── apps/
│   ├── web/          # Next.js — Admin Dashboard + Direct Booking Page
│   └── api/          # NestJS — REST API
└── packages/
    └── types/        # Shared TypeScript types/interfaces
```

### โครงสร้าง Database (Prisma Schema หลัก)

**RoomType**
- `id`, `name`, `description`, `maxOccupancy`, `totalUnits`, `imageUrls[]`, `createdAt`, `updatedAt`

**RoomRate**
- `id`, `roomTypeId`, `date` (วันเดียว), `price` (Decimal), `createdAt`
- Unique constraint: `(roomTypeId, date)`

**Booking**
- `id`, `roomTypeId`, `guestId`, `checkIn`, `checkOut`, `totalPrice` (Decimal), `status` (PENDING / CONFIRMED / CANCELLED), `paymentStatus` (UNPAID / PAID), `stripeSessionId`, `guestName`, `guestPhone`, `createdAt`, `updatedAt`

**User** (แขก)
- `id`, `email`, `name`, `passwordHash` (nullable สำหรับ OAuth), `provider` (EMAIL / GOOGLE), `createdAt`

**Admin**
- `id`, `email`, `passwordHash`, `name`, `createdAt`

### Modules (NestJS)

| Module | ความรับผิดชอบ |
|---|---|
| `AuthModule` | Guest auth (NextAuth), Admin auth (JWT), session management |
| `RoomTypeModule` | CRUD ประเภทห้องพัก, จัดการ inventory count |
| `RateCalendarModule` | กำหนดและอ่านราคารายคืนต่อ RoomType |
| `AvailabilityModule` | Logic หลัก: ตรวจสอบว่าห้องว่างหรือไม่ในช่วงวันที่กำหนด |
| `BookingModule` | Lifecycle การจอง: สร้าง, แก้ไข, ยกเลิก, เปลี่ยนสถานะ |
| `PaymentModule` | Stripe Checkout session creation + Webhook handler |
| `NotificationModule` | ส่งอีเมลแจ้งเตือนผ่าน Resend/SendGrid |
| `AdminModule` | Admin-only endpoints สำหรับ Dashboard |

### Availability Engine (Deep Module)

Logic สำคัญที่สุดในระบบ ต้องทำงานแม่นยำ:

```
availableUnits(roomTypeId, checkIn, checkOut) =
  totalUnits(roomTypeId) - confirmedBookings(roomTypeId, checkIn, checkOut)
```

- นับ booking ที่ status = CONFIRMED ที่ overlap กับช่วงวันที่ที่ request
- Overlap condition: `booking.checkIn < checkOut AND booking.checkOut > checkIn`
- ถ้า `availableUnits >= 1` ถือว่าสามารถจองได้

### Booking Flow (Guest)

```
/book → เลือกวันที่ → ดูห้องที่ว่าง → เลือกห้อง → กรอกข้อมูล → Stripe Checkout → Webhook → ยืนยัน → อีเมล
```

1. Guest เลือกวันที่ → API เรียก `AvailabilityModule`
2. Guest เลือก RoomType → สร้าง Booking (status: PENDING) + Stripe Checkout Session
3. Guest ชำระเงินใน Stripe
4. Stripe ส่ง `checkout.session.completed` webhook → NestJS อัปเดต Booking เป็น CONFIRMED + PAID
5. `NotificationModule` ส่งอีเมลหาแขกและแอดมิน

### Cancellation Policy

ไม่มีการคืนเงินในทุกกรณี (All sales final) ไม่ต้องมี Stripe Refund logic

### API Contract (หลัก)

```
GET  /api/availability?roomTypeId=&checkIn=&checkOut=
GET  /api/room-types
POST /api/bookings                    (guest)
POST /api/bookings/:id/cancel         (admin)
PUT  /api/bookings/:id                (admin)
POST /api/admin/bookings              (admin - manual booking)
GET  /api/admin/bookings              (admin)
PUT  /api/admin/room-types/:id/rates  (admin - bulk rate update)
POST /webhooks/stripe
```

### Authentication

- **Guest:** NextAuth.js v5 กับ Credentials Provider (email/password) + Google Provider
- **Admin:** NextAuth.js v5 กับ Credentials Provider เท่านั้น (role: `ADMIN`)
- NestJS API ตรวจสอบ JWT ที่ออกโดย NextAuth ผ่าน `JwtAuthGuard`
- Admin routes ใช้ `RolesGuard` เพิ่มเติม

---

## Testing Decisions

### หลักการเขียน Test

- ทดสอบ **external behavior** ไม่ใช่ implementation details
- อย่า mock database — ใช้ test database จริง (PostgreSQL in-memory หรือ Docker)
- แต่ละ test ต้อง isolated — ใช้ transaction rollback หรือ truncate ระหว่าง tests
- ทดสอบผ่าน public interface ของแต่ละ module ไม่ใช่ internal methods

### Modules ที่ต้อง Test

| Module | ประเภท Test | เหตุผล |
|---|---|---|
| `AvailabilityModule` | Unit + Integration | Business logic หลัก ต้อง test ทุก edge case |
| `BookingModule` | Integration | Lifecycle ซับซ้อน มีหลาย state transitions |
| `RateCalendarModule` | Integration | การคำนวณราคาต้องแม่นยำ |
| `PaymentModule` | Integration (Stripe mock) | Webhook handling ต้อง idempotent |
| `NotificationModule` | Unit (email mock) | ตรวจสอบว่าส่งอีเมลถูก trigger และมี content ถูกต้อง |
| `RoomTypeModule` | Integration | CRUD + inventory count validation |

### Test Cases สำคัญสำหรับ AvailabilityModule

- ห้องว่างทั้งหมด → คืนค่า `totalUnits`
- ห้องที่จองแล้ว 1 ห้อง → คืนค่า `totalUnits - 1`
- ห้องที่เต็ม → คืนค่า `0`
- Booking ที่ overlap บางส่วน (check-in ก่อน, check-out ทับ)
- Booking ที่ติดกัน (check-out วันนี้ / check-in วันนี้) → ต้องไม่นับเป็น overlap
- Booking ที่ถูก cancel → ต้องไม่นับใน availability

---

## Out of Scope

สิ่งต่อไปนี้ไม่รวมอยู่ใน v1 นี้:

- Coupon / discount codes
- Revenue dashboard และ reporting
- SMS notifications (เช่น Twilio)
- Channel manager (sync กับ Airbnb, Booking.com)
- Multi-language / multi-currency
- Room assignment (ระบุห้องเฉพาะเจาะจง เช่น ห้อง 101)
- Housekeeping / check-in / check-out tracking
- Multi-property support
- Embeddable booking widget

---

## Further Notes

- **Currency และ Timezone:** ต้องกำหนดก่อน implement — แนะนำ `THB` และ `Asia/Bangkok` เป็น default แต่ควรเก็บไว้ใน environment config เพื่อความยืดหยุ่น
- **Tax/Service Charge:** ยังไม่ได้กำหนด — แนะนำให้ราคาที่แสดงเป็น all-inclusive (รวม VAT แล้ว) เพื่อความเรียบง่าย
- **Deployment:** แนะนำ Vercel สำหรับ `apps/web` และ Railway หรือ Fly.io สำหรับ `apps/api` + PostgreSQL
- **Stripe Webhook Idempotency:** Payment Module ต้องตรวจสอบ `stripeSessionId` ก่อนอัปเดต Booking เพื่อป้องกัน double-confirm จาก webhook retry
- **Rate Calendar Default:** ถ้าวันที่ใดไม่มีราคากำหนดไว้ ระบบควร block การจองหรือใช้ราคา default — ต้องตัดสินใจก่อน implement
- **Stripe Test Mode:** ให้ใช้ Stripe test keys ตลอดช่วง development และ staging

---

*วันที่: 27 เมษายน 2026*
