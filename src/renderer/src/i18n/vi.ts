import { JobCategory, JobStatus, PresetTier } from '@shared/types'

export const VI_STRINGS = {
  appName: 'File Compressor',
  appSubtitle: 'Nén & tối ưu dung lượng cục bộ (Offline)',
  nav: {
    media: 'Nén Media & PDF',
    archive: 'Tạo ZIP / 7z',
    history: 'Lịch sử',
    settings: 'Cài đặt & Hỗ trợ'
  },
  presetTiers: {
    high_quality: 'Chất lượng cao',
    balanced: 'Cân bằng (Mặc định)',
    small_size: 'Ưu tiên dung lượng',
    custom: 'Tùy chỉnh nâng cao'
  } satisfies Record<PresetTier, string>,
  categories: {
    image: 'Ảnh tĩnh',
    video: 'Video',
    pdf: 'Tài liệu PDF',
    archive: 'Archive ZIP/7z'
  } satisfies Record<JobCategory, string>,
  statuses: {
    queued: {
      label: 'Chờ xử lý',
      desc: 'Đang nằm trong hàng đợi chờ đến lượt.'
    },
    probing: {
      label: 'Đang kiểm tra',
      desc: 'Đang đọc metadata, codec và cấu trúc file.'
    },
    running: {
      label: 'Đang nén',
      desc: 'Đang thực thi tiến trình nén hoặc dò dung lượng.'
    },
    validating: {
      label: 'Đang xác thực',
      desc: 'Đang kiểm tra tính toàn vẹn và giải mã thử file đầu ra.'
    },
    completed: {
      label: 'Hoàn tất',
      desc: 'Đã nén và xác thực đầu ra thành công.'
    },
    no_savings: {
      label: 'Đã tối ưu sẵn',
      desc: 'File gốc đã rất tối ưu, kết quả nén không nhỏ hơn nên giữ nguyên nguồn.'
    },
    converted_not_smaller: {
      label: 'Đã đổi định dạng (Lớn hơn gốc)',
      desc: 'Đã xuất theo định dạng/kích thước yêu cầu nhưng dung lượng lớn hơn file gốc.'
    },
    target_unmet: {
      label: 'Không đạt mục tiêu MB/KB',
      desc: 'Không thể ép xuống dưới dung lượng mục tiêu trong giới hạn chất lượng/kích thước cho phép.'
    },
    failed: {
      label: 'Lỗi xử lý',
      desc: 'Quá trình xử lý gặp sự cố. Xem chi tiết lỗi bên dưới.'
    },
    cancelled: {
      label: 'Đã hủy',
      desc: 'Tác vụ đã bị dừng theo yêu cầu người dùng.'
    },
    interrupted: {
      label: 'Bị gián đoạn',
      desc: 'Ứng dụng đã đóng đột ngột khi tác vụ đang chạy. Có thể nhấn Thử lại.'
    },
    unsupported: {
      label: 'Ngoài phạm vi hỗ trợ',
      desc: 'Định dạng hoặc thông số file nằm ngoài phạm vi cam kết.'
    }
  } satisfies Record<JobStatus, { label: string; desc: string }>
}
