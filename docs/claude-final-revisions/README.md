# Aracım Cepte — Claude Final Revision Pack

Bu paket 2 Eylül 2026 fiziksel Android testinden sonra kalan son revizyonları Claude Code'a devretmek için hazırlanmıştır.

Claude önce kökteki `CLAUDE.md`, sonra `docs/handoff/CLAUDE_PROJECT_CONTEXT.md` ve `docs/handoff/CLAUDE_CURRENT_STATE.md` dosyalarını, ardından bu paketteki bütün dosyaları okumalıdır.

Hard rules:
- Sadece `claude/final-qa-fixes` branch/worktree üzerinde çalış.
- `main` ve `develop` branch'lerine merge etme.
- Mevcut çalışan işlevleri kaldırma.
- UI değişikliği için auth/Supabase/entitlement mimarisini bozma.
- Supabase bağlıysa gereken güvenli backend işlemlerini kendin yap ve doğrula.
- Kullanıcı açıkça istemeden APK/AAB build başlatma.
