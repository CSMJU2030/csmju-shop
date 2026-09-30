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
hit "GET  /api/v1/ไม่มีจริง          404 handler"           404 GET  "/api/not-exist"


echo
echo "── Products ──"
hit "GET  /api/v1/products                  รายการสินค้า"   200 GET  "/api/v1/products"
hit "GET  /api/v1/products?is_preorder=true กรองพรีออเดอร์" 200 GET  "/api/v1/products?is_preorder=true"
hit "GET  /api/v1/products?search=โปโล      ค้นหา"          200 GET  "/api/v1/products?search=%E0%B9%82%E0%B8%9B%E0%B9%82%E0%B8%A5"
hit "GET  /api/v1/products/categories/all   หมวดหมู่"       200 GET  "/api/v1/products/categories/all"
hit "GET  /api/v1/products/1                รายตัว"         200 GET  "/api/v1/products/1"
hit "POST /api/v1/products                  สร้าง+variants" 201 POST "/api/v1/products" \
  '{"name":"สมุดโน้ต CSMJU","description":"สมุดปกแข็ง A5","category":"เครื่องเขียน","is_preorder":false,"variants":[{"variant_name":"ปกเขียว","price":120,"stock_quantity":30}]}'
NEW_PRODUCT=$(jqv ".data.product_id")
NEW_VARIANT=$(jqv ".data.variants[0].variant_id")
hit "POST /api/v1/products                  พรีออเดอร์ไม่มีวันปิด → 422" 422 POST "/api/v1/products" \
  '{"name":"x","category":"y","is_preorder":true}'
hit "PUT  /api/v1/products/$NEW_PRODUCT               แก้ไข"          200 PUT  "/api/v1/products/$NEW_PRODUCT" '{"description":"แก้ไขรายละเอียดแล้ว"}'

echo
echo "── Variants ──"
hit "GET  /api/v1/variants                  รายการ"         200 GET  "/api/v1/variants"
hit "GET  /api/v1/variants?product_id=1     ตามสินค้า"      200 GET  "/api/v1/variants?product_id=1"
hit "GET  /api/v1/variants/1                รายตัว"         200 GET  "/api/v1/variants/1"
hit "POST /api/v1/variants                  สร้าง"          201 POST "/api/v1/variants" \
  "{\"product_id\":$NEW_PRODUCT,\"variant_name\":\"ปกดำ\",\"price\":120,\"stock_quantity\":20}"
EXTRA_VARIANT=$(jqv ".data.variant_id")
hit "PATCH /api/v1/variants/$EXTRA_VARIANT/stock         เพิ่มสต็อก"     200 PATCH "/api/v1/variants/$EXTRA_VARIANT/stock" '{"adjust":10}'
hit "PATCH /api/v1/variants/$EXTRA_VARIANT/stock         ติดลบ → 422"   422 PATCH "/api/v1/variants/$EXTRA_VARIANT/stock" '{"adjust":-9999}'
hit "PUT  /api/v1/variants/$EXTRA_VARIANT                แก้ราคา"        200 PUT  "/api/v1/variants/$EXTRA_VARIANT" '{"price":135}'

echo
echo "── Orders ──"
hit "GET  /api/v1/orders                    รายการ"         200 GET  "/api/v1/orders"
hit "GET  /api/v1/orders?order_status=pending กรองสถานะ"    200 GET  "/api/v1/orders?order_status=pending"
hit "GET  /api/v1/orders/1                  รายตัว"         200 GET  "/api/v1/orders/1"
hit "GET  /api/v1/orders/number/ORD-202609-0001  ตามเลขที่" 200 GET  "/api/v1/orders/number/ORD-202609-0001"
hit "GET  /api/v1/orders/stats/summary      สรุปยอด"        200 GET  "/api/v1/orders/stats/summary"
hit "POST /api/v1/orders                    สร้าง (pickup)" 201 POST "/api/v1/orders" \
  "{\"core_user_id\":\"user-002\",\"customer_name\":\"สมชาย รักเรียน\",\"customer_email\":\"somchai.r@csmju.ac.th\",\"customer_phone\":\"0812345678\",\"delivery_method\":\"pickup\",\"items\":[{\"variant_id\":$NEW_VARIANT,\"quantity\":2}]}"
NEW_ORDER=$(jqv ".data.order_id")
NEW_CODE=$(jqv ".data.pickup_code")
hit "POST /api/v1/orders                    delivery ไม่มีที่อยู่ → 422" 422 POST "/api/v1/orders" \
  '{"core_user_id":"user-002","customer_name":"สมชาย รักเรียน","customer_email":"somchai.r@csmju.ac.th","customer_phone":"0812345678","delivery_method":"delivery","items":[{"variant_id":1,"quantity":1}]}'
hit "POST /api/v1/orders                    สต็อกไม่พอ → 409"          409 POST "/api/v1/orders" \
  "{\"core_user_id\":\"user-002\",\"customer_name\":\"สมชาย รักเรียน\",\"customer_email\":\"somchai.r@csmju.ac.th\",\"customer_phone\":\"0812345678\",\"delivery_method\":\"pickup\",\"items\":[{\"variant_id\":$NEW_VARIANT,\"quantity\":99999}]}"
hit "PATCH /api/v1/orders/$NEW_ORDER/payment-slip       แนบสลิป"        200 PATCH "/api/v1/orders/$NEW_ORDER/payment-slip" '{"payment_slip":"https://example.com/slip.jpg"}'
hit "PATCH /api/v1/orders/$NEW_ORDER/payment-status     ยืนยันชำระ"     200 PATCH "/api/v1/orders/$NEW_ORDER/payment-status" '{"payment_status":"paid"}'
hit "PATCH /api/v1/orders/$NEW_ORDER/order-status       พร้อมรับ"       200 PATCH "/api/v1/orders/$NEW_ORDER/order-status" '{"order_status":"ready_for_pickup"}'
hit "PATCH /api/v1/orders/$NEW_ORDER/order-status       ค่าผิด → 422"   422 PATCH "/api/v1/orders/$NEW_ORDER/order-status" '{"order_status":"ไม่รู้จัก"}'

echo
echo "── Order Items ──"
hit "GET  /api/v1/orders/$NEW_ORDER/items               รายการในออร์เดอร์" 200 GET  "/api/v1/orders/$NEW_ORDER/items"
hit "POST /api/v1/orders/$NEW_ORDER/items               เพิ่มสินค้า"       201 POST "/api/v1/orders/$NEW_ORDER/items" \
  "{\"variant_id\":$EXTRA_VARIANT,\"quantity\":1}"
NEW_ITEM=$(jqv ".data.item_id")
hit "GET  /api/v1/order-items/$NEW_ITEM                 รายตัว"            200 GET  "/api/v1/order-items/$NEW_ITEM"
hit "PUT  /api/v1/order-items/$NEW_ITEM                 แก้จำนวน"          200 PUT  "/api/v1/order-items/$NEW_ITEM" '{"quantity":3}'
hit "DELETE /api/v1/order-items/$NEW_ITEM               ลบ+คืนสต็อก"       200 DELETE "/api/v1/order-items/$NEW_ITEM"

echo
echo "── Pickup Logs ──"
hit "GET  /api/v1/pickup-logs                ประวัติ"        200 GET  "/api/v1/pickup-logs"
hit "GET  /api/v1/pickup-logs/1              รายตัว"         200 GET  "/api/v1/pickup-logs/1"
hit "POST /api/v1/pickup-logs/verify         ตรวจรหัสถูก"    200 POST "/api/v1/pickup-logs/verify" "{\"pickup_code\":\"$NEW_CODE\"}"
hit "POST /api/v1/pickup-logs/verify         รหัสผิด → 404"  404 POST "/api/v1/pickup-logs/verify" '{"pickup_code":"PICKUP-000000"}'
hit "POST /api/v1/pickup-logs                ไม่ระบุเจ้าหน้าที่ → 422" 422 POST "/api/v1/pickup-logs" \
  "{\"pickup_code\":\"$NEW_CODE\",\"notes\":\"ไม่ควรผ่าน\"}"
hit "POST /api/v1/pickup-logs                staff บันทึกรับสินค้า"  201 POST "/api/v1/pickup-logs" \
  "{\"pickup_code\":\"$NEW_CODE\",\"staff_core_user_id\":\"user-003\",\"staff_name\":\"วิชัย ดูแลร้าน\",\"notes\":\"ส่งมอบเรียบร้อย\"}"
NEW_LOG=$(jqv ".data.pickup_id")
hit "DELETE /api/v1/pickup-logs/$NEW_LOG               ลบบันทึก"          200 DELETE "/api/v1/pickup-logs/$NEW_LOG"

echo
echo "── Cleanup (ลบข้อมูลที่สร้างระหว่างทดสอบ) ──"
hit "DELETE /api/v1/orders/$NEW_ORDER                  ลบออร์เดอร์+คืนสต็อก" 200 DELETE "/api/v1/orders/$NEW_ORDER"
hit "DELETE /api/v1/variants/$EXTRA_VARIANT            ลบ variant"          200 DELETE "/api/v1/variants/$EXTRA_VARIANT"
hit "DELETE /api/v1/products/$NEW_PRODUCT              ลบสินค้า"            200 DELETE "/api/v1/products/$NEW_PRODUCT"

echo
echo "════════════════════════════════════════"
printf "  ผ่าน %d  /  ไม่ผ่าน %d\n" "$PASS" "$FAIL"
echo "════════════════════════════════════════"
[ "$FAIL" -eq 0 ] || exit 1
