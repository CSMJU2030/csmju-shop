#!/usr/bin/env bash
# ============================================================
#  CSMJU-Shop — Smoke Test ยิงทุก endpoint ด้วย curl
#  ใช้เมื่อไม่อยากเปิด Postman  ->  bash tests/smoke-test.sh
#  ต้องรัน `npm run dev` ไว้ก่อน
# ============================================================
BASE="${BASE_URL:-http://localhost:3000}"
PASS=0; FAIL=0

hit() { # hit <ชื่อ> <expect_status> <method> <path> [json_body]
  local name="$1" expect="$2" method="$3" path="$4" body="$5"
  local out code
  if [ -n "$body" ]; then
    out=$(curl -s -w '\n%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json' -d "$body")
  else
    out=$(curl -s -w '\n%{http_code}' -X "$method" "$BASE$path")
  fi
  code=$(echo "$out" | tail -1)
  BODY=$(echo "$out" | sed '$d')
  if [ "$code" = "$expect" ]; then
    PASS=$((PASS+1)); printf '  ✅ %-52s %s\n' "$name" "$code"
  else
    FAIL=$((FAIL+1)); printf '  ❌ %-52s %s (คาดหวัง %s)\n' "$name" "$code" "$expect"
    echo "     → $(echo "$BODY" | head -c 200)"
  fi
}

jqv() { echo "$BODY" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(eval('JSON.parse(s)$1'))}catch(e){console.log('')}})"; }

echo "🔎 ทดสอบ CSMJU-Shop API ที่ $BASE"
echo
echo "── System ──"
hit "GET  /                      ข้อมูล API"            200 GET  "/"
hit "GET  /api/health            ตรวจสอบสถานะ"          200 GET  "/api/health"
hit "GET  /api/ไม่มีจริง          404 handler"           404 GET  "/api/not-exist"

echo
echo "── Users ──"
hit "GET  /api/users             รายการผู้ใช้"           200 GET  "/api/users"
hit "GET  /api/users?role=staff  กรองตาม role"          200 GET  "/api/users?role=staff"
hit "GET  /api/users/1           รายตัว"                200 GET  "/api/users/1"
hit "GET  /api/users/99999       ไม่พบ"                 404 GET  "/api/users/99999"
hit "POST /api/users             สร้างผู้ใช้"            201 POST "/api/users" \
  '{"student_id":"6604101999","fullname":"ทดสอบ ระบบ","email":"test.smoke@csmju.ac.th","phone":"0899999999","role":"customer"}'
NEW_USER=$(jqv ".data.user_id")
hit "POST /api/users             อีเมลซ้ำ → 409"        409 POST "/api/users" \
  '{"fullname":"ซ้ำ","email":"test.smoke@csmju.ac.th","phone":"0800000001"}'
hit "POST /api/users             ขาดฟิลด์ → 422"        422 POST "/api/users" '{"fullname":"ไม่ครบ"}'
hit "PUT  /api/users/$NEW_USER          แก้ไข"                  200 PUT  "/api/users/$NEW_USER" '{"phone":"0888888888"}'

echo
echo "── Products ──"
hit "GET  /api/products                  รายการสินค้า"   200 GET  "/api/products"
hit "GET  /api/products?is_preorder=true กรองพรีออเดอร์" 200 GET  "/api/products?is_preorder=true"
hit "GET  /api/products?search=โปโล      ค้นหา"          200 GET  "/api/products?search=%E0%B9%82%E0%B8%9B%E0%B9%82%E0%B8%A5"
hit "GET  /api/products/categories/all   หมวดหมู่"       200 GET  "/api/products/categories/all"
hit "GET  /api/products/1                รายตัว"         200 GET  "/api/products/1"
hit "POST /api/products                  สร้าง+variants" 201 POST "/api/products" \
  '{"name":"สมุดโน้ต CSMJU","description":"สมุดปกแข็ง A5","category":"เครื่องเขียน","is_preorder":false,"variants":[{"variant_name":"ปกเขียว","price":120,"stock_quantity":30}]}'
NEW_PRODUCT=$(jqv ".data.product_id")
NEW_VARIANT=$(jqv ".data.variants[0].variant_id")
hit "POST /api/products                  พรีออเดอร์ไม่มีวันปิด → 422" 422 POST "/api/products" \
  '{"name":"x","category":"y","is_preorder":true}'
hit "PUT  /api/products/$NEW_PRODUCT               แก้ไข"          200 PUT  "/api/products/$NEW_PRODUCT" '{"description":"แก้ไขรายละเอียดแล้ว"}'

echo
echo "── Variants ──"
hit "GET  /api/variants                  รายการ"         200 GET  "/api/variants"
hit "GET  /api/variants?product_id=1     ตามสินค้า"      200 GET  "/api/variants?product_id=1"
hit "GET  /api/variants/1                รายตัว"         200 GET  "/api/variants/1"
hit "POST /api/variants                  สร้าง"          201 POST "/api/variants" \
  "{\"product_id\":$NEW_PRODUCT,\"variant_name\":\"ปกดำ\",\"price\":120,\"stock_quantity\":20}"
EXTRA_VARIANT=$(jqv ".data.variant_id")
hit "PATCH /api/variants/$EXTRA_VARIANT/stock         เพิ่มสต็อก"     200 PATCH "/api/variants/$EXTRA_VARIANT/stock" '{"adjust":10}'
hit "PATCH /api/variants/$EXTRA_VARIANT/stock         ติดลบ → 422"   422 PATCH "/api/variants/$EXTRA_VARIANT/stock" '{"adjust":-9999}'
hit "PUT  /api/variants/$EXTRA_VARIANT                แก้ราคา"        200 PUT  "/api/variants/$EXTRA_VARIANT" '{"price":135}'

echo
echo "── Orders ──"
hit "GET  /api/orders                    รายการ"         200 GET  "/api/orders"
hit "GET  /api/orders?order_status=pending กรองสถานะ"    200 GET  "/api/orders?order_status=pending"
hit "GET  /api/orders/1                  รายตัว"         200 GET  "/api/orders/1"
hit "GET  /api/orders/number/ORD-202609-0001  ตามเลขที่" 200 GET  "/api/orders/number/ORD-202609-0001"
hit "GET  /api/orders/stats/summary      สรุปยอด"        200 GET  "/api/orders/stats/summary"
hit "POST /api/orders                    สร้าง (pickup)" 201 POST "/api/orders" \
  "{\"user_id\":1,\"delivery_method\":\"pickup\",\"items\":[{\"variant_id\":$NEW_VARIANT,\"quantity\":2}]}"
NEW_ORDER=$(jqv ".data.order_id")
NEW_CODE=$(jqv ".data.pickup_code")
hit "POST /api/orders                    delivery ไม่มีที่อยู่ → 422" 422 POST "/api/orders" \
  '{"user_id":1,"delivery_method":"delivery","items":[{"variant_id":1,"quantity":1}]}'
hit "POST /api/orders                    สต็อกไม่พอ → 409"          409 POST "/api/orders" \
  "{\"user_id\":1,\"delivery_method\":\"pickup\",\"items\":[{\"variant_id\":$NEW_VARIANT,\"quantity\":99999}]}"
hit "PATCH /api/orders/$NEW_ORDER/payment-slip       แนบสลิป"        200 PATCH "/api/orders/$NEW_ORDER/payment-slip" '{"payment_slip":"https://example.com/slip.jpg"}'
hit "PATCH /api/orders/$NEW_ORDER/payment-status     ยืนยันชำระ"     200 PATCH "/api/orders/$NEW_ORDER/payment-status" '{"payment_status":"paid"}'
hit "PATCH /api/orders/$NEW_ORDER/order-status       พร้อมรับ"       200 PATCH "/api/orders/$NEW_ORDER/order-status" '{"order_status":"ready_for_pickup"}'
hit "PATCH /api/orders/$NEW_ORDER/order-status       ค่าผิด → 422"   422 PATCH "/api/orders/$NEW_ORDER/order-status" '{"order_status":"ไม่รู้จัก"}'

echo
echo "── Order Items ──"
hit "GET  /api/orders/$NEW_ORDER/items               รายการในออร์เดอร์" 200 GET  "/api/orders/$NEW_ORDER/items"
hit "POST /api/orders/$NEW_ORDER/items               เพิ่มสินค้า"       201 POST "/api/orders/$NEW_ORDER/items" \
  "{\"variant_id\":$EXTRA_VARIANT,\"quantity\":1}"
NEW_ITEM=$(jqv ".data.item_id")
hit "GET  /api/order-items/$NEW_ITEM                 รายตัว"            200 GET  "/api/order-items/$NEW_ITEM"
hit "PUT  /api/order-items/$NEW_ITEM                 แก้จำนวน"          200 PUT  "/api/order-items/$NEW_ITEM" '{"quantity":3}'
hit "DELETE /api/order-items/$NEW_ITEM               ลบ+คืนสต็อก"       200 DELETE "/api/order-items/$NEW_ITEM"

echo
echo "── Pickup Logs ──"
hit "GET  /api/pickup-logs                ประวัติ"        200 GET  "/api/pickup-logs"
hit "GET  /api/pickup-logs/1              รายตัว"         200 GET  "/api/pickup-logs/1"
hit "POST /api/pickup-logs/verify         ตรวจรหัสถูก"    200 POST "/api/pickup-logs/verify" "{\"pickup_code\":\"$NEW_CODE\"}"
hit "POST /api/pickup-logs/verify         รหัสผิด → 404"  404 POST "/api/pickup-logs/verify" '{"pickup_code":"PICKUP-000000"}'
hit "POST /api/pickup-logs                customer บันทึก → 403" 403 POST "/api/pickup-logs" \
  "{\"pickup_code\":\"$NEW_CODE\",\"staff_id\":1,\"notes\":\"ไม่ควรผ่าน\"}"
hit "POST /api/pickup-logs                staff บันทึกรับสินค้า"  201 POST "/api/pickup-logs" \
  "{\"pickup_code\":\"$NEW_CODE\",\"staff_id\":3,\"notes\":\"ส่งมอบเรียบร้อย\"}"
NEW_LOG=$(jqv ".data.pickup_id")
hit "DELETE /api/pickup-logs/$NEW_LOG               ลบบันทึก"          200 DELETE "/api/pickup-logs/$NEW_LOG"

echo
echo "── Cleanup (ลบข้อมูลที่สร้างระหว่างทดสอบ) ──"
hit "DELETE /api/orders/$NEW_ORDER                  ลบออร์เดอร์+คืนสต็อก" 200 DELETE "/api/orders/$NEW_ORDER"
hit "DELETE /api/variants/$EXTRA_VARIANT            ลบ variant"          200 DELETE "/api/variants/$EXTRA_VARIANT"
hit "DELETE /api/products/$NEW_PRODUCT              ลบสินค้า"            200 DELETE "/api/products/$NEW_PRODUCT"
hit "DELETE /api/users/$NEW_USER                    ลบผู้ใช้"            200 DELETE "/api/users/$NEW_USER"
hit "DELETE /api/users/1                            มีออร์เดอร์ → 409"   409 DELETE "/api/users/1"

echo
echo "════════════════════════════════════════"
printf "  ผ่าน %d  /  ไม่ผ่าน %d\n" "$PASS" "$FAIL"
echo "════════════════════════════════════════"
[ "$FAIL" -eq 0 ] || exit 1
