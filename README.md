# HUB Vi Vu – Đi mô ở Huế?

Bản đồ khám phá Huế bằng MapLibre GL JS và Vite. Chạy với Node.js 22.12 trở lên.

```sh
npm ci
npm run dev
```

Mở địa chỉ Vite in ra (mặc định cổng 5173). Dùng `npm run build` để tạo website tĩnh trong `dist/`, rồi `npm run preview` để kiểm tra bản build.

## Dữ liệu và hiển thị

Ba tệp khởi đầu trong `public/data/` đến từ gói HUE-01. `hue-zoom1-overview.json` chứa khung nhìn PA1/PA2, giới hạn kéo và mô tả địa danh. `hue-zoom1-ready.geojson` cung cấp 9 điểm đã xác minh và 2 điểm đặt nhãn bờ. Các khu, chợ hoặc tuyến thiếu hình học xuất hiện trong danh sách với thông tin bàn giao. Bản đồ dùng hình học sông và đường của nền vector.

Để thêm quán, thêm một bản ghi vào `records` trong `hue-zoom2-branches.json`, theo mẫu của một chi nhánh hiện có. Dùng `id` duy nhất, `name_standard`, `alt_names`, `category_l1` (ca_phe, tra_sua, quan_an hoặc quan_nuoc), `riverbank`, `address_or_location`, trạng thái xác minh và `coordinates` theo thứ tự **[kinh độ, vĩ độ]** WGS 84. Ghi nguồn, ngày kiểm tra và tình trạng hoạt động. Đặt tọa độ là `null` khi chưa xác minh. Ghim xuất hiện từ z14.5 và gộp các chi nhánh có cùng shared_pin_group. Tìm kiếm và bộ lọc dùng toàn bộ danh sách. Các bản ghi tạm hoãn không được thả ghim.

Chỉ đặt `google_maps_entitled: true` và `google_maps_url` (liên kết HTTPS Google Maps) khi đã xác nhận quyền lợi. Gói hiện tại chưa xác nhận quyền lợi cho quán nào. Ngưỡng zoom và khoảng cách tối thiểu giữa ghim, nhãn được cấu hình trong `src/map.js`.

## Bản đồ nền

Máy đám mây chặn máy chủ tile OpenFreeMap. Bản thử dùng **Protomaps tự lưu trữ**, phương án trong đặc tả, đóng gói 620 tile MVT vùng Huế (z10–15, phóng tiếp tới z18), sprite và glyph ngay trong `public/base/`. Trình duyệt chỉ tải tài nguyên cùng website. Không cần khóa API hoặc tài khoản trả phí.

Dữ liệu nền © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Bản Protomaps ngày 14/09/2026 được trích theo [nguồn phân phối tile vùng Huế](https://github.com/NamVu215/wgo/tree/d7a18ce34f0ebcfa69d2b703ba5392bbc49dc586/public/nen-ban-do). Thông tin bản dựng và vùng phủ ở `public/base/hue/nguon.json`. Kiểu nền dùng @protomaps/basemaps, bỏ lớp POI, dùng glyph Noto Sans (OFL). Biểu tượng giao diện dùng Lucide.

## Dữ liệu HUE-03

Các tọa độ chi nhánh và nguồn tương ứng nằm trong `public/data/hue-zoom2-branches.json` và `public/data/hue-zoom3.json`. Mốc 2 mở ở z14.5, mốc 3 ở z15.5. Dùng cùng `shared_pin_group` cho các quán cùng tòa nhà. Danh mục món nằm ở `category_l2`, mỗi quán chọn các ID tương ứng trong `dish_tags`. Các điểm cần xác minh được lưu riêng trong `hue-pending.json`. Tọa độ tham khảo từ [Wikipedia và Wikivoyage contributors](https://creativecommons.org/licenses/by-sa/4.0/) theo CC BY-SA 4.0 và từ OpenStreetMap theo ODbL. Nguồn chi tiết được lưu trong tệp dữ liệu.

## Quán từ Google Maps

Để dùng nguồn trực tiếp, bật billing, **Maps JavaScript API** và **Places API (New)** trong Google Cloud. Tạo khóa trình duyệt giới hạn kiểu **Websites** cho `https://huybao2206.github.io/*` và giới hạn API vào hai dịch vụ trên. Khóa Maps JavaScript xuất hiện trong trình duyệt theo thiết kế. Đặt quota theo ngân sách.

Trên GitHub, thêm repository Actions secret `VITE_GOOGLE_MAPS_API_KEY`, rồi chạy **Deploy HUB Vi Vu to Pages → Run workflow**. Khi phát triển, đặt cùng tên trong `.env.local` và cho phép referrer localhost dùng để thử. Bản build thiếu khóa dùng cẩm nang Huế đã đóng gói.

Khi có khóa, trang mở Google Maps với màu nền và ghim riêng. Places Text Search (New) tìm tối đa 20 kết quả mỗi lượt trong khung khám phá Huế. Nhập tên hoặc món, hoặc chọn loại quán để tìm lại. Ứng dụng dùng tên, địa chỉ, vị trí, loại hình, ID và ghi công; kết quả chỉ ở bộ nhớ phiên. Danh sách yêu thích lưu Place ID. Trong chế độ Google, quán đã lưu được đọc lại từ Places khi mở danh sách. Dữ liệu cẩm nang HUE-03 cùng bộ lọc hai bờ và món đã gắn thẻ vẫn mở được qua “Cẩm nang Huế”.
