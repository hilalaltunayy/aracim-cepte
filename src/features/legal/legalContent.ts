export const legalDraftStatus = 'HUKUK İNCELEMESİ BEKLİYOR';

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export const kvkkNoticeSections: LegalSection[] = [
  {
    title: 'Taslak statüsü',
    paragraphs: [
      'Bu metin yalnız bilgilendirme taslağıdır. Hukukçu tarafından onaylanmamıştır ve KVKK uyumluluğu iddiası oluşturmaz.',
      'Bu aydınlatma metni açık rıza beyanı değildir. Hesap oluşturma sırasında genel bir açık rıza alınmamaktadır.',
    ],
  },
  {
    title: 'İşlenen veri kategorileri',
    paragraphs: [
      'Hesap ve iletişim verileri; araç bilgileri; kilometre, gider, bakım ve hatırlatıcı kayıtları; kullanıcının isteğe bağlı yüklediği araç belgeleri işlenebilir.',
      'Yüklenen belgeler kimlik, adres, plaka, şasi, poliçe, finansal bilgi veya üçüncü kişilere ait veriler içerebilir. Gereksiz veri yüklenmemelidir.',
    ],
  },
  {
    title: 'İşleme amaçları',
    paragraphs: [
      'Veriler hesabın işletilmesi, araç kayıtlarının saklanması, hatırlatıcıların sunulması, güvenlik, hata giderme ve kullanıcının talep ettiği silme işlemleri için kullanılmak üzere tasarlanmıştır.',
      'Pazarlama, OCR/AI analizi veya isteğe bağlı hassas belge analizi bu temel amaçlara dahil değildir ve ayrı değerlendirme gerektirir.',
    ],
  },
  {
    title: 'Sağlayıcılar ve yurt dışı aktarım',
    paragraphs: [
      'Supabase projesinin Frankfurt bölgesinde olduğu ürün sahibi tarafından belirtilmiştir. Supabase, Resend ve alt işleyenlere ilişkin veri akışı ile Türkiye dışına aktarım mekanizması henüz profesyonel hukuk incelemesini tamamlamamıştır.',
      'Belge yüklemenin production kullanımı, gerekli hukuki ve teknik release kontrolleri tamamlanana kadar onaylanmış sayılmaz.',
    ],
  },
  {
    title: 'Saklama, silme ve başvuru',
    paragraphs: [
      'Saklama süreleri, yedekler, provider logları ve ilgili kişi başvuru kanalı hukuk incelemesiyle kesinleştirilecektir.',
      'Uygulama hesap ve kullanıcı verisi silme akışı sunar; production kabulü gerçek ortamda uçtan uca doğrulama gerektirir.',
    ],
  },
];

export const privacyPolicySections: LegalSection[] = [
  {
    title: 'Taslak statüsü',
    paragraphs: [
      'Bu gizlilik politikası taslaktır, hukukçu tarafından onaylanmamıştır ve production için yayımlanmış nihai politika değildir.',
      'Uygulamanın teknik güvenlik kontrollerini açıklar; tek başına hukuki uyumluluk sağlamaz.',
    ],
  },
  {
    title: 'Toplanan ve saklanan bilgiler',
    paragraphs: [
      'Aracım Cepte; hesap bilgilerini, kullanıcı tarafından girilen araç ve kilometre bilgilerini, gider/bakım kayıtlarını, hatırlatıcıları ve isteğe bağlı belge dosyalarını saklamak üzere tasarlanmıştır.',
      'Belge içerikleri, dosya adları, signed URL’ler, erişim tokenları veya kişisel veriler uygulama loglarına bilerek yazılmaz.',
    ],
  },
  {
    title: 'Belge güvenliği',
    paragraphs: [
      'Belgeler private Supabase Storage bucket içinde owner-scoped, rastgele object yollarıyla saklanır. Erişim kısa süreli signed URL ile sağlanır.',
      'Ücretsiz hesap için hedef sınırlar 10 belge, toplam 25 MB ve dosya başına 5 MB’dır. Yalnız PDF, JPG/JPEG ve PNG kabul edilir.',
    ],
  },
  {
    title: 'Paylaşım ve sağlayıcılar',
    paragraphs: [
      'Supabase ve e-posta hizmeti kullanılıyorsa Resend ile bunların alt işleyenleri hukuk ve veri akışı incelemesine tabidir.',
      'Belge OCR/AI sağlayıcısına gönderilmez. Böyle bir özellik gelecekte sunulursa ayrı bilgilendirme, kullanıcı kontrolü ve gerekebilecek açık rıza mekanizması tasarlanacaktır.',
    ],
  },
  {
    title: 'Silme ve değişiklikler',
    paragraphs: [
      'Kullanıcı belgeyi, araç verisini veya hesabını silebilir. Hesap silmede Storage dosyalarının da kaldırılması teknik olarak uygulanır ve release öncesi doğrulanır.',
      'Nihai saklama süreleri, yedek davranışı, başvuru kanalı ve politika değişiklik bildirimi hukuk incelemesi sonrasında yayımlanacaktır.',
    ],
  },
];
