const { transporter } = require("../configs/nodemailer.config");
const path = require('path');

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *                    🎮 TOPUP24H - PREMIUM EMAIL TEMPLATES 🎮
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Style: Dark Gaming Premium
 * Theme: Deep dark backgrounds, neon violet/purple accents, glassmorphism panels
 * Vibe: Professional, trustworthy, modern gaming platform
 */

// ═══════════════════════════════════════════════════════════════════════════════
//                              🎨 DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const THEME = {
    // Core Dark Palette
    bgDeep: "#0A0A0F",           // Deepest background
    bgDark: "#12121A",           // Main email background
    bgCard: "#1A1A24",           // Card/Container background
    bgCardHover: "#222230",      // Slightly lighter for contrast
    bgInput: "#0D0D14",          // Input field backgrounds

    // Borders & Lines
    borderSubtle: "#2A2A3C",     // Subtle dividers
    borderAccent: "#3D3D5C",     // More visible borders
    borderGlow: "#8B5CF6",       // Glowing accent border

    // Brand Colors
    primary: "#8B5CF6",          // Main violet/purple
    primaryLight: "#A78BFA",     // Lighter violet
    primaryDark: "#7C3AED",      // Darker violet
    primaryGlow: "rgba(139, 92, 246, 0.3)", // Glow effect

    // Accent Colors
    accent: "#06B6D4",           // Cyan accent
    accentGlow: "rgba(6, 182, 212, 0.3)",

    // Functional Colors
    success: "#10B981",
    successBg: "rgba(16, 185, 129, 0.15)",
    error: "#EF4444",
    errorBg: "rgba(239, 68, 68, 0.15)",
    warning: "#F59E0B",
    warningBg: "rgba(245, 158, 11, 0.15)",
    info: "#3B82F6",
    infoBg: "rgba(59, 130, 246, 0.15)",

    // Typography
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    textInverse: "#0A0A0F",

    // Gradients
    gradientPrimary: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
    gradientDanger: "linear-gradient(135deg, #EF4444 0%, #F97316 100%)",
    gradientSuccess: "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
    gradientDark: "linear-gradient(180deg, #1A1A24 0%, #12121A 100%)",
};

// Logo attachment
const logoAttachment = {
    filename: 'logo.png',
    path: path.join(process.cwd(), 'src/uploads/logo.png'),
    cid: 'logo'
};

// ═══════════════════════════════════════════════════════════════════════════════
//                              📧 BASE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
function baseTemplate(options = {}) {
    const {
        title = "Topup24h",
        subtitle = "",
        content = "",
        headerGradient = THEME.gradientPrimary,
        headerIcon = "🎮",
    } = options;

    return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${THEME.bgDeep}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    
    <!-- Preheader Text (Hidden) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        ${subtitle || title} - Topup24h.vn
    </div>

    <!-- Email Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${THEME.bgDeep};">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                
                <!-- Main Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: ${THEME.bgDark}; border-radius: 24px; overflow: hidden; border: 1px solid ${THEME.borderSubtle}; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- ═══════════ HEADER ═══════════ -->
                    <tr>
                        <td style="background: ${headerGradient}; padding: 50px 40px; text-align: center;">
                            <!-- Logo -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <div style="width: 70px; height: 70px; background: rgba(255,255,255,0.15); border-radius: 20px; display: inline-block; line-height: 70px; font-size: 32px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2);">
                                            ${headerIcon}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                            ${title}
                                        </h1>
                                    </td>
                                </tr>
                                ${subtitle ? `
                                <tr>
                                    <td align="center" style="padding-top: 10px;">
                                        <p style="margin: 0; color: rgba(255,255,255,0.85); font-size: 16px; font-weight: 400;">
                                            ${subtitle}
                                        </p>
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </td>
                    </tr>

                    <!-- ═══════════ CONTENT ═══════════ -->
                    <tr>
                        <td style="padding: 40px 35px;">
                            ${content}
                        </td>
                    </tr>

                    <!-- ═══════════ FOOTER ═══════════ -->
                    <tr>
                        <td style="background-color: ${THEME.bgCard}; padding: 35px; border-top: 1px solid ${THEME.borderSubtle};">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <!-- Brand -->
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <img src="cid:logo" alt="Topup24h" style="height: 40px; border-radius: 8px;">
                                    </td>
                                </tr>
                                <!-- Tagline -->
                                <tr>
                                    <td align="center" style="padding-bottom: 20px;">
                                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 14px; font-weight: 500;">
                                            🎮 Nạp game uy tín hàng đầu Việt Nam
                                        </p>
                                    </td>
                                </tr>
                                <!-- Links -->
                                <tr>
                                    <td align="center" style="padding-bottom: 25px;">
                                        <a href="https://topup24h.vn" style="color: ${THEME.primary}; text-decoration: none; font-size: 14px; margin: 0 12px;">Trang chủ</a>
                                        <span style="color: ${THEME.borderAccent};">•</span>
                                        <a href="https://topup24h.vn/user/history" style="color: ${THEME.primary}; text-decoration: none; font-size: 14px; margin: 0 12px;">Lịch sử</a>
                                        <span style="color: ${THEME.borderAccent};">•</span>
                                        <a href="https://www.facebook.com/profile.php?id=61586972106424" style="color: ${THEME.primary}; text-decoration: none; font-size: 14px; margin: 0 12px;">Hỗ trợ</a>
                                    </td>
                                </tr>
                                <!-- Copyright -->
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; color: ${THEME.textMuted}; font-size: 12px; line-height: 1.6;">
                                            © 2026 Topup24h. All rights reserved.<br>
                                            Email tự động - Vui lòng không phản hồi trực tiếp.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                
                <!-- Bottom Tagline -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px;">
                    <tr>
                        <td align="center" style="padding: 25px 20px;">
                            <p style="margin: 0; color: ${THEME.textMuted}; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">
                                Uy tín • Nhanh chóng • Bảo mật
                            </p>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>
    `.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              🔐 SEND OTP - ĐĂNG KÝ
// ═══════════════════════════════════════════════════════════════════════════════
async function sendOTP(email, otp) {
    try {
        const username = email.split('@')[0];
        const otpDigits = otp.toString().split('');

        const content = `
            <!-- Welcome Message -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td style="padding-bottom: 25px;">
                        <p style="margin: 0 0 10px 0; color: ${THEME.textPrimary}; font-size: 18px;">
                            Xin chào <strong style="color: ${THEME.primary};">${username}</strong> 👋
                        </p>
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 15px; line-height: 1.7;">
                            Chào mừng bạn đến với <strong style="color: ${THEME.textPrimary};">Topup24h</strong>! Để hoàn tất đăng ký, hãy nhập mã xác minh bên dưới.
                        </p>
                    </td>
                </tr>
            </table>

            <!-- OTP Box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.bgCard}; border-radius: 16px; border: 1px solid ${THEME.borderGlow}; overflow: hidden;">
                <tr>
                    <td style="padding: 35px 25px; text-align: center;">
                        <p style="margin: 0 0 20px 0; color: ${THEME.textMuted}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
                            Mã xác minh của bạn
                        </p>
                        <!-- OTP Digits -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                                ${otpDigits.map(digit => `
                                    <td style="padding: 0 6px;">
                                        <div style="width: 52px; height: 64px; background: ${THEME.bgInput}; border: 2px solid ${THEME.borderAccent}; border-radius: 12px; font-size: 28px; font-weight: 700; color: ${THEME.primary}; line-height: 60px; text-align: center; font-family: 'Courier New', monospace;">
                                            ${digit}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: ${THEME.textMuted}; font-size: 13px;">
                            ⏱️ Mã có hiệu lực trong <strong style="color: ${THEME.warning};">5 phút</strong>
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Warning -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 25px;">
                <tr>
                    <td style="background: ${THEME.warningBg}; border-left: 4px solid ${THEME.warning}; border-radius: 8px; padding: 15px 18px;">
                        <p style="margin: 0; color: ${THEME.warning}; font-size: 13px; line-height: 1.6;">
                            <strong>⚠️ Lưu ý bảo mật:</strong> Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên hỗ trợ.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const html = baseTemplate({
            title: "Xác Minh Tài Khoản",
            subtitle: "Chỉ còn một bước nữa thôi!",
            content,
            headerIcon: "🚀"
        });

        // TEMPORARILY DISABLED: Logging OTP instead of sending email
        console.log(`\n\n[OTP Bypassed] Registration OTP for ${email}: ${otp}\n\n`);
        const info = { messageId: "bypassed-otp-" + Date.now() };
        /* 
        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "🚀 Mã xác minh đăng ký tài khoản",
            html,
            attachments: [logoAttachment]
        });
        */

        // Email sent successfully
        return info;
    } catch (error) {
        console.error("❌ Send OTP Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          🔐 SEND OTP - KHÔI PHỤC MẬT KHẨU
// ═══════════════════════════════════════════════════════════════════════════════
async function sendOTPRePass(email, otp) {
    try {
        const otpDigits = otp.toString().split('');

        const content = `
            <!-- Security Alert Header -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                    <td align="center">
                        <div style="width: 80px; height: 80px; background: ${THEME.errorBg}; border-radius: 50%; display: inline-block; line-height: 80px; font-size: 40px; margin-bottom: 15px;">
                            🛡️
                        </div>
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 15px; line-height: 1.7;">
                            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản:
                        </p>
                        <p style="margin: 10px 0 0 0; color: ${THEME.error}; font-size: 18px; font-weight: 700;">
                            ${email}
                        </p>
                    </td>
                </tr>
            </table>

            <!-- OTP Box - Security Theme -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.errorBg}; border-radius: 16px; border: 2px dashed ${THEME.error}; overflow: hidden;">
                <tr>
                    <td style="padding: 35px 25px; text-align: center;">
                        <p style="margin: 0 0 20px 0; color: ${THEME.error}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                            🔐 Mã Bảo Mật
                        </p>
                        <!-- OTP Digits -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                                ${otpDigits.map(digit => `
                                    <td style="padding: 0 6px;">
                                        <div style="width: 52px; height: 64px; background: ${THEME.bgDark}; border: 2px solid ${THEME.error}; border-radius: 12px; font-size: 28px; font-weight: 700; color: ${THEME.error}; line-height: 60px; text-align: center; font-family: 'Courier New', monospace;">
                                            ${digit}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: ${THEME.textMuted}; font-size: 13px;">
                            Mã sẽ hết hạn trong <strong style="color: ${THEME.error};">5 phút</strong>
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Security Warning -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 25px;">
                <tr>
                    <td style="background: ${THEME.bgCard}; border-radius: 12px; padding: 20px; text-align: center;">
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 14px; line-height: 1.7;">
                            Nếu bạn <strong style="color: ${THEME.textPrimary};">không yêu cầu</strong> thao tác này, vui lòng bỏ qua email hoặc đổi mật khẩu ngay lập tức vì tài khoản có thể đang bị xâm nhập.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const html = baseTemplate({
            title: "Khôi Phục Mật Khẩu",
            subtitle: "Yêu cầu đặt lại mật khẩu",
            content,
            headerGradient: THEME.gradientDanger,
            headerIcon: "🔒"
        });

        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "🔐 [CẢNH BÁO] Mã khôi phục mật khẩu",
            html,
            attachments: [logoAttachment]
        });

        return info;
    } catch (error) {
        console.error("❌ Send OTP Reset Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          💎 SEND ACC - GỬI TÀI KHOẢN ĐÃ MUA
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
//                          💎 SEND ACC - GỬI TÀI KHOẢN ĐÃ MUA (PREMIUM DESIGN)
// ═══════════════════════════════════════════════════════════════════════════════
async function sendAcc(email, data, order) {
    try {
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(order.price ?? 0);

        const orderDate = new Date(order.create_at || order.created_at).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Unique Premium Template for Account Delivery
        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Giao Hàng Thành Công - #${order.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #050505; background-image: radial-gradient(circle at 50% 50%, #1a1a2e 0%, #050505 100%);">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                
                <!-- Main Container with custom glow border -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #0d0d12; border-radius: 30px; overflow: hidden; border: 1px solid #2a2a3c; box-shadow: 0 0 40px rgba(139, 92, 246, 0.15);">
                    
                    <!-- Premium Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 60px 40px; text-align: center; border-bottom: 2px solid #8b5cf6;">
                            <div style="width: 80px; height: 80px; background: rgba(139, 92, 246, 0.1); border: 2px solid #8b5cf6; border-radius: 20px; display: inline-block; line-height: 80px; font-size: 36px; margin-bottom: 20px; box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);">
                                💎
                            </div>
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">
                                Giao Hàng Thành Công
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #8b5cf6; font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                                ĐƠN HÀNG #${order.id} ĐÃ HOÀN TẤT
                            </p>
                        </td>
                    </tr>

                    <!-- Main Credential Area -->
                    <tr>
                        <td style="padding: 40px 35px;">
                            <p style="margin: 0 0 30px 0; color: #a1a1aa; font-size: 15px; text-align: center; line-height: 1.6;">
                                Chúc mừng! Giao dịch của bạn tại <strong style="color: #ffffff;">Topup24h</strong> đã được xử lý thành công. Dưới đây là thông tin tài khoản của bạn:
                            </p>

                            <!-- Glassmorphism Credential Box -->
                            <div style="background: #16161e; border: 1px solid #2a2a3c; border-radius: 20px; padding: 30px; margin-bottom: 30px; position: relative; overflow: hidden;">
                                <!-- Subtle grid pattern overlay would go here if email supported it, but we'll use CSS instead -->
                                
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <!-- Tài khoản Header -->
                                    <tr>
                                        <td>
                                            <div style="color: #6366f1; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                                                 TÀI KHOẢN ĐĂNG NHẬP
                                            </div>
                                            <div style="background: #09090b; border: 1px solid #1e1e2d; border-radius: 12px; padding: 18px; margin-bottom: 25px;">
                                                <code style="color: #ffffff; font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; word-break: break-all;">
                                                    ${data.account || data.acc_username || "..."}
                                                </code>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Mật khẩu Header -->
                                    <tr>
                                        <td>
                                            <div style="color: #06b6d4; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                                                 MẬT KHẨU
                                            </div>
                                            <div style="background: #09090b; border: 1px solid #1e1e2d; border-radius: 12px; padding: 18px; margin-bottom: 25px;">
                                                <code style="color: #ffffff; font-size: 18px; font-weight: 700; font-family: 'JetBrains Mono', 'Courier New', monospace; word-break: break-all;">
                                                    ${data.password || data.acc_password || "..."}
                                                </code>
                                            </div>
                                        </td>
                                    </tr>
                                    <!-- Thông tin thêm -->
                                    ${(data.note || data.acc_info) ? `
                                    <tr>
                                        <td>
                                            <div style="color: #a1a1aa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                                                 LƯU Ý QUAN TRỌNG
                                            </div>
                                            <div style="background: rgba(139, 92, 246, 0.05); border-left: 4px solid #8b5cf6; padding: 15px; border-radius: 4px;">
                                                <p style="margin: 0; color: #d4d4d8; font-size: 14px; font-style: italic; line-height: 1.6;">
                                                    ${data.note || data.acc_info}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            <!-- Dashboard Link -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://topup24h.vn/account?tab=acc-history" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: #ffffff; padding: 18px 35px; border-radius: 15px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);">
                                            📥 Truy cập Lịch sử Mua hàng
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Receipt Sidebar-like section -->
                    <tr>
                        <td style="padding: 0 35px 40px 35px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #11111a; border-radius: 15px; padding: 25px;">
                                <tr>
                                    <td style="color: #71717a; font-size: 13px;">Thời gian giao dịch</td>
                                    <td align="right" style="color: #e4e4e7; font-size: 13px; font-weight: 600;">${orderDate}</td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 15px; color: #71717a; font-size: 13px;">Tổng thanh toán</td>
                                    <td align="right" style="padding-top: 15px; color: #10b981; font-size: 16px; font-weight: 700;">${formattedPrice}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Security Alert -->
                    <tr>
                        <td style="background-color: #1a1a24; padding: 25px 35px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="color: #fca5a5; font-size: 13px; line-height: 1.6; text-align: center;">
                                        ⚠️ <strong>CẢNH BÁO BẢO MẬT:</strong> Chúng tôi khuyến nghị bạn <strong>đổi mật khẩu ngay lập tức</strong> sau khi đăng nhập thành công để đảm bảo an toàn tuyệt đối cho tài khoản.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 40px; text-align: center; border-top: 1px solid #1e1e2d;">
                            <img src="cid:logo" alt="Topup24h Logo" style="height: 35px; border-radius: 8px; margin-bottom: 20px; opacity: 0.8;">
                            <p style="margin: 0; color: #52525b; font-size: 12px; line-height: 1.8;">
                                © 2026 Topup24h.vn - Hệ thống nạp game tự động hàng đầu.<br>
                                Đây là email tự động, vui lòng không trả lời.
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Extra Space -->
                <div style="height: 40px;"></div>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();

        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🎁 [TÀI KHOẢN MỚI] Giao hàng thành công: Đơn hàng #${order.id}`,
            html,
            attachments: [logoAttachment]
        });

        return info;
    } catch (error) {
        console.error("❌ Send Acc Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          📊 SEND STATUS - CẬP NHẬT TRẠNG THÁI
// ═══════════════════════════════════════════════════════════════════════════════
async function sendStatus(email, order) {
    try {
        const formattedAmount = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(order.amount ?? 0);

        const statusConfig = {
            success: {
                text: "Thành Công",
                color: THEME.success,
                bg: THEME.successBg,
                icon: "✅",
                msg: "Giao dịch của bạn đã hoàn tất thành công!",
                gradient: THEME.gradientSuccess
            },
            cancel: {
                text: "Đã Hủy",
                color: THEME.error,
                bg: THEME.errorBg,
                icon: "❌",
                msg: "Giao dịch đã bị hủy. Liên hệ hỗ trợ nếu cần.",
                gradient: THEME.gradientDanger
            },
            pending: {
                text: "Chờ Xử Lý",
                color: THEME.warning,
                bg: THEME.warningBg,
                icon: "⏳",
                msg: "Hệ thống đang kiểm tra giao dịch của bạn.",
                gradient: THEME.gradientPrimary
            },
            processing: {
                text: "Đang Xử Lý",
                color: THEME.info,
                bg: THEME.infoBg,
                icon: "🔄",
                msg: "Vui lòng đợi, chúng tôi đang xử lý đơn hàng.",
                gradient: THEME.gradientPrimary
            },
        };

        const status = statusConfig[order.status] || {
            text: order.status,
            color: THEME.textMuted,
            bg: THEME.bgCard,
            icon: "ℹ️",
            msg: "Trạng thái giao dịch đã được cập nhật.",
            gradient: THEME.gradientPrimary
        };

        const content = `
            <!-- Status Display -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="text-align: center; margin-bottom: 30px;">
                <tr>
                    <td>
                        <div style="width: 100px; height: 100px; background: ${status.bg}; border-radius: 50%; display: inline-block; line-height: 100px; font-size: 50px; margin-bottom: 20px; border: 3px solid ${status.color};">
                            ${status.icon}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <h2 style="margin: 0 0 10px 0; color: ${status.color}; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                            ${status.text}
                        </h2>
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 15px;">
                            ${status.msg}
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Order Details Card -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.bgCard}; border-radius: 16px; border: 1px solid ${THEME.borderAccent}; overflow: hidden; margin-bottom: 25px;">
                <tr>
                    <td style="padding: 25px;">
                        <!-- Order ID -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 15px;">
                            <tr>
                                <td style="color: ${THEME.textMuted}; font-size: 14px;">Mã đơn hàng</td>
                                <td align="right" style="color: ${THEME.primary}; font-size: 16px; font-weight: 700;">#${order.id}</td>
                            </tr>
                        </table>
                        <!-- Divider -->
                        <div style="border-top: 1px dashed ${THEME.borderSubtle}; margin: 15px 0;"></div>
                        <!-- Amount -->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="color: ${THEME.textMuted}; font-size: 14px;">Số tiền giao dịch</td>
                                <td align="right" style="color: ${THEME.textPrimary}; font-size: 18px; font-weight: 700;">${formattedAmount}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- CTA Button -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                    <td align="center">
                        <a href="https://topup24h.vn/user/history" style="display: inline-block; background: ${THEME.gradientPrimary}; color: #FFFFFF; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 8px 20px ${THEME.primaryGlow};">
                            📋 Xem lịch sử giao dịch
                        </a>
                    </td>
                </tr>
            </table>

            <!-- Support Note -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 25px;">
                <tr>
                    <td align="center">
                        <p style="margin: 0; color: ${THEME.textMuted}; font-size: 13px;">
                            Cần hỗ trợ? <a href="https://m.me/939588092574339" style="color: ${THEME.primary}; text-decoration: none;">Chat ngay</a> hoặc phản hồi email này.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const html = baseTemplate({
            title: "Cập Nhật Trạng Thái",
            subtitle: `Đơn hàng #${order.id}: ${status.text}`,
            content,
            headerGradient: status.gradient,
            headerIcon: "📊"
        });

        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🔔 Đơn hàng #${order.id}: ${status.text.toUpperCase()}`,
            html,
            attachments: [logoAttachment]
        });

        return info;
    } catch (error) {
        console.error("❌ Send Status Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          SEND ADMIN BALANCE OTP - ADMIN THAO TÁC SỐ DƯ
// ═══════════════════════════════════════════════════════════════════════════════
async function sendAdminBalanceOTP(email, otp) {
    try {
        const otpDigits = otp.toString().split('');

        const content = `
            <!-- Admin Badge Header -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                    <td align="center">
                        <div style="width: 90px; height: 90px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-radius: 50%; display: inline-block; line-height: 90px; font-size: 45px; margin-bottom: 15px; box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);">
                            👑
                        </div>
                        <p style="margin: 0 0 8px 0; color: ${THEME.warning}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                            Xác Thực Admin
                        </p>
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 15px; line-height: 1.7;">
                            Hệ thống nhận được yêu cầu thao tác <strong style="color: ${THEME.textPrimary};">số dư người dùng</strong>.
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Admin Info Box -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.warningBg}; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3); margin-bottom: 25px;">
                <tr>
                    <td style="padding: 18px; text-align: center;">
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 13px;">
                            Đang thao tác với tư cách:
                        </p>
                        <p style="margin: 6px 0 0 0; color: ${THEME.warning}; font-size: 16px; font-weight: 700;">
                            🔐 ${email}
                        </p>
                    </td>
                </tr>
            </table>

            <!-- OTP Box - Gold Theme -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.bgCard}; border-radius: 16px; border: 2px solid ${THEME.warning}; overflow: hidden; box-shadow: 0 0 30px rgba(245, 158, 11, 0.15);">
                <tr>
                    <td style="padding: 35px 25px; text-align: center;">
                        <p style="margin: 0 0 20px 0; color: ${THEME.warning}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                            👑 Mã Xác Thực Admin
                        </p>
                        <!-- OTP Digits -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                                ${otpDigits.map(digit => `
                                    <td style="padding: 0 6px;">
                                        <div style="width: 52px; height: 64px; background: linear-gradient(180deg, #1A1A24 0%, #12121A 100%); border: 2px solid ${THEME.warning}; border-radius: 12px; font-size: 28px; font-weight: 700; color: ${THEME.warning}; line-height: 60px; text-align: center; font-family: 'Courier New', monospace; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);">
                                            ${digit}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: ${THEME.textMuted}; font-size: 13px;">
                            ⏱️ Mã có hiệu lực trong <strong style="color: ${THEME.warning};">5 phút</strong>
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Action Info -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 25px;">
                <tr>
                    <td style="background: ${THEME.bgCard}; border-radius: 12px; padding: 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td width="40" valign="top" style="padding-right: 15px;">
                                    <div style="font-size: 24px;">💰</div>
                                </td>
                                <td>
                                    <p style="margin: 0 0 5px 0; color: ${THEME.textPrimary}; font-size: 14px; font-weight: 600;">
                                        Thao tác yêu cầu xác thực
                                    </p>
                                    <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 13px; line-height: 1.6;">
                                        Cộng/Trừ số dư tài khoản người dùng. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Security Warning -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                <tr>
                    <td style="background: ${THEME.errorBg}; border-left: 4px solid ${THEME.error}; border-radius: 8px; padding: 15px 18px;">
                        <p style="margin: 0; color: ${THEME.error}; font-size: 13px; line-height: 1.6;">
                            <strong>⚠️ Cảnh báo bảo mật:</strong> Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên khác. Mỗi thao tác sẽ được ghi log.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const html = baseTemplate({
            title: "Xác Thực Admin",
            subtitle: "Yêu cầu thao tác số dư người dùng",
            content,
            headerGradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)",
            headerIcon: "👑"
        });

        // TEMPORARILY DISABLED: Logging OTP instead of sending email
        console.log(`\n\n[OTP Bypassed] Admin Balance OTP for ${email}: ${otp}\n\n`);
        const info = { messageId: "bypassed-admin-otp-" + Date.now() };
        /*
        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "👑 [ADMIN] Mã xác thực thao tác số dư",
            html,
            attachments: [logoAttachment]
        });
        */

        return info;
    } catch (error) {
        console.error("❌ Send Admin Balance OTP Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          🎖️ SEND ROLE PROMOTION OTP - THĂNG CẤP QUYỀN
// ═══════════════════════════════════════════════════════════════════════════════
async function sendRolePromotionOTP(email, otp, targetUserEmail, newRole) {
    try {
        const otpDigits = otp.toString().split('');

        const roleLabels = {
            admin: { text: "Quản Trị Viên (Admin)", icon: "�", color: "#EF4444" },
            agent: { text: "Cộng Tác Viên (Agent)", icon: "🎖️", color: "#06B6D4" },
            user: { text: "Người Dùng", icon: "👤", color: "#6B7280" }
        };

        const roleInfo = roleLabels[newRole] || { text: newRole, icon: "🔄", color: THEME.primary };

        const content = `
            <!-- Promotion Header -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 25px;">
                <tr>
                    <td align="center">
                        <div style="width: 90px; height: 90px; background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%); border-radius: 50%; display: inline-block; line-height: 90px; font-size: 45px; margin-bottom: 15px; box-shadow: 0 8px 25px rgba(6, 182, 212, 0.4);">
                            🎖️
                        </div>
                        <p style="margin: 0 0 8px 0; color: ${THEME.accent}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                            Thăng Cấp Quyền Hạn
                        </p>
                        <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 15px; line-height: 1.7;">
                            Yêu cầu thay đổi quyền hạn người dùng
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Target User Info -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.bgCard}; border-radius: 12px; border: 1px solid ${THEME.borderAccent}; margin-bottom: 25px;">
                <tr>
                    <td style="padding: 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td style="padding-bottom: 15px; border-bottom: 1px dashed ${THEME.borderSubtle};">
                                    <p style="margin: 0 0 5px 0; color: ${THEME.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                                        Tài khoản được thăng cấp
                                    </p>
                                    <p style="margin: 0; color: ${THEME.textPrimary}; font-size: 16px; font-weight: 600;">
                                        📧 ${targetUserEmail}
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding-top: 15px;">
                                    <p style="margin: 0 0 5px 0; color: ${THEME.textMuted}; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                                        Quyền hạn mới
                                    </p>
                                    <div style="display: inline-block; background: ${roleInfo.color}20; border: 1px solid ${roleInfo.color}; border-radius: 8px; padding: 8px 16px;">
                                        <span style="color: ${roleInfo.color}; font-size: 16px; font-weight: 700;">
                                            ${roleInfo.icon} ${roleInfo.text}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- OTP Box - Cyan Theme -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${THEME.bgCard}; border-radius: 16px; border: 2px solid ${THEME.accent}; overflow: hidden; box-shadow: 0 0 30px ${THEME.accentGlow};">
                <tr>
                    <td style="padding: 35px 25px; text-align: center;">
                        <p style="margin: 0 0 20px 0; color: ${THEME.accent}; font-size: 12px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">
                            🎖️ Mã Xác Thực Thăng Cấp
                        </p>
                        <!-- OTP Digits -->
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                                ${otpDigits.map(digit => `
                                    <td style="padding: 0 6px;">
                                        <div style="width: 52px; height: 64px; background: linear-gradient(180deg, #1A1A24 0%, #12121A 100%); border: 2px solid ${THEME.accent}; border-radius: 12px; font-size: 28px; font-weight: 700; color: ${THEME.accent}; line-height: 60px; text-align: center; font-family: 'Courier New', monospace; box-shadow: 0 4px 12px ${THEME.accentGlow};">
                                            ${digit}
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        </table>
                        <p style="margin: 20px 0 0 0; color: ${THEME.textMuted}; font-size: 13px;">
                            ⏱️ Mã có hiệu lực trong <strong style="color: ${THEME.accent};">5 phút</strong>
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Admin Action Info -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 25px;">
                <tr>
                    <td style="background: ${THEME.infoBg}; border-radius: 12px; padding: 20px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                                <td width="40" valign="top" style="padding-right: 15px;">
                                    <div style="font-size: 24px;">🔐</div>
                                </td>
                                <td>
                                    <p style="margin: 0 0 5px 0; color: ${THEME.textPrimary}; font-size: 14px; font-weight: 600;">
                                        Xác thực quyền Admin
                                    </p>
                                    <p style="margin: 0; color: ${THEME.textSecondary}; font-size: 13px; line-height: 1.6;">
                                        Đang thực hiện với tư cách: <strong style="color: ${THEME.primary};">${email}</strong>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Security Warning -->
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
                <tr>
                    <td style="background: ${THEME.errorBg}; border-left: 4px solid ${THEME.error}; border-radius: 8px; padding: 15px 18px;">
                        <p style="margin: 0; color: ${THEME.error}; font-size: 13px; line-height: 1.6;">
                            <strong>⚠️ Cảnh báo:</strong> Thay đổi quyền hạn là thao tác quan trọng. Không chia sẻ mã này với bất kỳ ai.
                        </p>
                    </td>
                </tr>
            </table>
        `;

        const html = baseTemplate({
            title: "Thăng Cấp Quyền Hạn",
            subtitle: `Yêu cầu thăng cấp lên ${roleInfo.text}`,
            content,
            headerGradient: "linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #0E7490 100%)",
            headerIcon: "🎖️"
        });

        // TEMPORARILY DISABLED: Logging OTP instead of sending email
        console.log(`\n\n[OTP Bypassed] Role Promotion OTP for ${email}: ${otp}\n\n`);
        const info = { messageId: "bypassed-role-otp-" + Date.now() };
        /*
        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🎖️ [ADMIN] Xác thực thăng cấp ${roleInfo.text}`,
            html,
            attachments: [logoAttachment]
        });
        */

        return info;
    } catch (error) {
        console.error("❌ Send Role Promotion OTP Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                          🎉 SEND ORDER SUCCESS - ĐƠN HÀNG THÀNH CÔNG
// ═══════════════════════════════════════════════════════════════════════════════
async function sendOrderSuccessEmail(email, orderData) {
    try {
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(orderData.amount || 0);

        const orderDate = new Date(orderData.created_at || orderData.create_at).toLocaleString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Parse account info if available
        let accountInfo = {};
        try {
            if (orderData.account_info) {
                accountInfo = typeof orderData.account_info === 'string'
                    ? JSON.parse(orderData.account_info)
                    : orderData.account_info;
            }
        } catch (e) {
            accountInfo = {};
        }

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn Hàng Thành Công - #${orderData.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
    
    <!-- Email Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(180deg, #030712 0%, #0f172a 100%);">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                
                <!-- Main Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(34, 197, 94, 0.3); box-shadow: 0 0 60px rgba(34, 197, 94, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- SUCCESS HEADER with Animation-like Design -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 50px 40px; text-align: center; position: relative;">
                            <!-- Decorative circles -->
                            <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                            <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                            
                            <!-- Success Icon -->
                            <div style="width: 90px; height: 90px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-block; line-height: 90px; font-size: 45px; margin-bottom: 20px; border: 3px solid rgba(255,255,255,0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                                ✅
                            </div>
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                GIAO DỊCH THÀNH CÔNG
                            </h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">
                                Đơn hàng #${orderData.id} đã hoàn tất
                            </p>
                        </td>
                    </tr>

                    <!-- ORDER RECEIPT CARD -->
                    <tr>
                        <td style="padding: 40px 35px;">
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 25px 0; color: #e2e8f0; font-size: 16px; line-height: 1.7;">
                                Xin chào <strong style="color: #34d399;">${orderData.user_name || 'Quý khách'}</strong>,<br>
                                Cảm ơn bạn đã tin tưởng sử dụng dịch vụ tại <strong style="color: #ffffff;">Topup24h</strong>! 🎮
                            </p>

                            <!-- Receipt Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; border: 1px solid #334155; overflow: hidden; margin-bottom: 25px;">
                                <!-- Receipt Header -->
                                <tr>
                                    <td style="background: linear-gradient(90deg, #059669 0%, #10b981 100%); padding: 15px 25px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #ffffff; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                                    📋 Chi tiết đơn hàng
                                                </td>
                                                <td align="right" style="color: rgba(255,255,255,0.9); font-size: 13px;">
                                                    #${orderData.id}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Receipt Body -->
                                <tr>
                                    <td style="padding: 25px;">
                                        <!-- Game & Package -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="color: #94a3b8; font-size: 13px; padding-bottom: 8px;">🎮 Game</td>
                                                <td align="right" style="color: #f1f5f9; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${orderData.game_name || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #94a3b8; font-size: 13px; padding-bottom: 8px;">📦 Gói nạp</td>
                                                <td align="right" style="color: #f1f5f9; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${orderData.package_name || 'N/A'}</td>
                                            </tr>
                                            ${accountInfo.uid ? `
                                            <tr>
                                                <td style="color: #94a3b8; font-size: 13px; padding-bottom: 8px;">👤 UID</td>
                                                <td align="right" style="color: #fbbf24; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${accountInfo.uid}</td>
                                            </tr>
                                            ` : ''}
                                            ${accountInfo.server ? `
                                            <tr>
                                                <td style="color: #94a3b8; font-size: 13px; padding-bottom: 8px;">🌐 Server</td>
                                                <td align="right" style="color: #f1f5f9; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${accountInfo.server}</td>
                                            </tr>
                                            ` : ''}
                                        </table>
                                        
                                        <!-- Divider -->
                                        <div style="border-top: 1px dashed #334155; margin: 20px 0;"></div>
                                        
                                        <!-- Total Amount -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #94a3b8; font-size: 14px;">💰 Tổng thanh toán</td>
                                                <td align="right" style="color: #34d399; font-size: 24px; font-weight: 800;">${formattedPrice}</td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Time -->
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 15px;">
                                            <tr>
                                                <td style="color: #64748b; font-size: 12px;">🕐 ${orderDate}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Status Timeline -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #10b981; border-radius: 8px; padding: 18px 20px; margin-bottom: 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #34d399; font-size: 14px; font-weight: 600;">
                                            ✓ Đã xác nhận thanh toán
                                        </p>
                                        <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 13px;">
                                            Đơn hàng của bạn đã được xử lý thành công và hoàn tất!
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="https://topup24h.vn/account?tab=order-history" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #FFFFFF; padding: 18px 45px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.4);">
                                            📋 Xem lịch sử đơn hàng
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #0f172a; padding: 30px; border-top: 1px solid #1e293b;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 15px;">
                                        <img src="cid:logo" alt="Topup24h" style="height: 35px; border-radius: 8px; opacity: 0.9;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.8;">
                                            Cần hỗ trợ? <a href="https://www.facebook.com/profile.php?id=61586972106424" style="color: #10b981; text-decoration: none;">Liên hệ ngay</a><br>
                                            © 2026 Topup24h.vn - Nạp game uy tín hàng đầu Việt Nam
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                
            </td>
        </tr>
    </table>

</body>
</html>
        `.trim();

        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `🎉 Đơn hàng #${orderData.id} thành công! - ${orderData.package_name || 'Nạp game'}`,
            html,
            attachments: [logoAttachment]
        });

        return info;
    } catch (error) {
        console.error("❌ Send Order Success Email Error:", error);
        throw error;
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
//                          ❌ SEND ORDER FAILURE - ĐƠN HÀNG THẤT BẠI
// ═══════════════════════════════════════════════════════════════════════════════
async function sendOrderFailureEmail(email, orderData, reason = "Đơn hàng đã bị hủy") {
    try {
        const formattedPrice = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(orderData.amount || 0);

        const orderDate = new Date(orderData.created_at || orderData.create_at).toLocaleString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đơn Hàng Đã Hủy - #${orderData.id}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;">
    
    <!-- Email Wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(180deg, #030712 0%, #1c1917 100%);">
        <tr>
            <td align="center" style="padding: 40px 15px;">
                
                <!-- Main Container -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background: linear-gradient(145deg, #1c1917 0%, #292524 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: 0 0 60px rgba(239, 68, 68, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    
                    <!-- CANCEL HEADER -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #ef4444 100%); padding: 50px 40px; text-align: center; position: relative;">
                            <!-- Decorative -->
                            <div style="position: absolute; top: -15px; right: -15px; width: 80px; height: 80px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                            
                            <!-- Cancel Icon -->
                            <div style="width: 90px; height: 90px; background: rgba(255,255,255,0.15); border-radius: 50%; display: inline-block; line-height: 90px; font-size: 45px; margin-bottom: 20px; border: 3px solid rgba(255,255,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
                                ⚠️
                            </div>
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                                ĐƠN HÀNG ĐÃ HỦY
                            </h1>
                            <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 500;">
                                Đơn hàng #${orderData.id} đã bị hủy
                            </p>
                        </td>
                    </tr>

                    <!-- ORDER DETAILS -->
                    <tr>
                        <td style="padding: 40px 35px;">
                            
                            <!-- Greeting -->
                            <p style="margin: 0 0 25px 0; color: #d6d3d1; font-size: 16px; line-height: 1.7;">
                                Xin chào <strong style="color: #fbbf24;">${orderData.user_name || 'Quý khách'}</strong>,<br>
                                Chúng tôi rất tiếc phải thông báo rằng đơn hàng của bạn đã bị hủy.
                            </p>

                            <!-- Reason Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px 20px; margin-bottom: 25px;">
                                <tr>
                                    <td>
                                        <p style="margin: 0; color: #fca5a5; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                            📋 Lý do hủy đơn
                                        </p>
                                        <p style="margin: 8px 0 0 0; color: #fef2f2; font-size: 15px; line-height: 1.6;">
                                            ${reason}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Order Details Card -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(145deg, #292524 0%, #1c1917 100%); border-radius: 16px; border: 1px solid #44403c; overflow: hidden; margin-bottom: 25px;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(90deg, #78350f 0%, #92400e 100%); padding: 15px 25px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #fef3c7; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                                    📄 Chi tiết đơn hàng
                                                </td>
                                                <td align="right" style="color: rgba(254,243,199,0.8); font-size: 13px;">
                                                    #${orderData.id}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Body -->
                                <tr>
                                    <td style="padding: 25px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="color: #a8a29e; font-size: 13px; padding-bottom: 8px;">🎮 Game</td>
                                                <td align="right" style="color: #e7e5e4; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${orderData.game_name || 'N/A'}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #a8a29e; font-size: 13px; padding-bottom: 8px;">📦 Gói nạp</td>
                                                <td align="right" style="color: #e7e5e4; font-size: 15px; font-weight: 600; padding-bottom: 8px;">${orderData.package_name || 'N/A'}</td>
                                            </tr>
                                        </table>
                                        
                                        <div style="border-top: 1px dashed #44403c; margin: 20px 0;"></div>
                                        
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td style="color: #a8a29e; font-size: 14px;">💰 Số tiền đơn hàng</td>
                                                <td align="right" style="color: #fbbf24; font-size: 22px; font-weight: 800;">${formattedPrice}</td>
                                            </tr>
                                        </table>
                                        
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 15px;">
                                            <tr>
                                                <td style="color: #78716c; font-size: 12px;">🕐 ${orderDate}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Refund Notice -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; padding: 25px; margin-bottom: 25px;">
                                <tr>
                                    <td align="center">
                                        <div style="font-size: 40px; margin-bottom: 15px;">💰</div>
                                        <p style="margin: 0 0 8px 0; color: #34d399; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                                            Hoàn tiền thành công
                                        </p>
                                        <p style="margin: 0 0 15px 0; color: #86efac; font-size: 28px; font-weight: 800;">
                                            ${formattedPrice}
                                        </p>
                                        <p style="margin: 0; color: #a7f3d0; font-size: 13px; line-height: 1.6;">
                                            ✓ Số tiền trên đã được hoàn vào số dư tài khoản của bạn
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Buttons -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 12px;">
                                        <a href="https://topup24h.vn/account?tab=order-history" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #FFFFFF; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3);">
                                            📋 Xem lịch sử
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <a href="https://topup24h.vn" style="display: inline-block; background: transparent; border: 2px solid #78716c; color: #d6d3d1; padding: 14px 35px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 13px;">
                                            🔄 Đặt đơn mới
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- SUPPORT SECTION -->
                    <tr>
                        <td style="background: #1c1917; padding: 25px 35px; border-top: 1px solid #292524;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; color: #a8a29e; font-size: 14px; line-height: 1.7;">
                                            Cần hỗ trợ? Đội ngũ chúng tôi luôn sẵn sàng giúp đỡ bạn!<br>
                                            <a href="https://m.me/939588092574339" style="color: #fbbf24; text-decoration: none; font-weight: 600;">💬 Chat với hỗ trợ viên</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="background: #0c0a09; padding: 30px; border-top: 1px solid #1c1917;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding-bottom: 15px;">
                                        <img src="cid:logo" alt="Topup24h" style="height: 35px; border-radius: 8px; opacity: 0.8;">
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0; color: #57534e; font-size: 12px; line-height: 1.8;">
                                            © 2026 Topup24h.vn - Nạp game uy tín hàng đầu Việt Nam<br>
                                            Đây là email tự động, vui lòng không trả lời trực tiếp.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
                
            </td>
        </tr>
    </table>

</body>
</html>
        `.trim();

        const info = await transporter.sendMail({
            from: `"Topup24h" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `⚠️ Đơn hàng #${orderData.id} đã bị hủy - Hoàn tiền ${formattedPrice}`,
            html,
            attachments: [logoAttachment]
        });

        return info;
    } catch (error) {
        console.error("❌ Send Order Failure Email Error:", error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//                              📦 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════
module.exports = {
    sendOTP,
    sendOTPRePass,
    sendAcc,
    sendStatus,
    sendAdminBalanceOTP,
    sendRolePromotionOTP,
    sendOrderSuccessEmail,
    sendOrderFailureEmail
};

