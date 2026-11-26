import Link from "next/link";
import { LEGAL } from "@/lib/legal/config";
import { LegalPage, Section } from "../legal-page";

export const metadata = { title: "Gizlilik Politikası ve KVKK Aydınlatma Metni · Yaver" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Gizlilik Politikası ve KVKK Aydınlatma Metni">
      <p>
        Bu metin, Yaver kişisel asistan hizmetini (&quot;Yaver&quot;) kullanırken kişisel verilerinin nasıl
        işlendiğini 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) 10. maddesi uyarınca
        açıklar. Yaver&apos;in temel ilkesi şudur: <strong>okumak serbest, değiştirmek onaya bağlı.</strong>{" "}
        Takvimine etkinlik eklemek ya da Gmail&apos;e taslak kaydetmek gibi dış hesaplarında değişiklik yaratan
        her işlem, sen onaylamadan yapılmaz. Yaver senin adına e-posta göndermez ve ödeme yapmaz.
      </p>

      <Section title="1. Veri sorumlusu">
        <p>
          Veri sorumlusu {LEGAL.controller}, {LEGAL.address} (&quot;biz&quot;). İletişim: {LEGAL.email}
        </p>
      </Section>

      <Section title="2. İşlediğimiz kişisel veriler">
        <ul>
          <li>
            <strong>Hesap bilgileri:</strong> Google ile girişte paylaşılan adın, e-posta adresin ve profil
            fotoğrafın.
          </li>
          <li>
            <strong>Google Takvim:</strong> etkinliklerin (başlık, saat, yer, açıklama, katılımcı bilgisi). Senin
            isteğin ya da sabah özeti için okunur; onayladığın etkinlikler takvimine eklenir.
          </li>
          <li>
            <strong>Gmail (Pro plan):</strong> senin isteğinle aranan ve açılan e-postalar; fatura takibi için
            günde bir kez fatura benzeri e-postalar ve bunların PDF ekleri (en fazla 5 MB). E-postaların
            tamamı Yaver&apos;de saklanmaz: yalnızca bulunan faturaların özeti (kurum, tutar, son ödeme tarihi)
            ve hangi e-postanın tarandığı bilgisi kaydedilir. Onayladığın yanıt taslakları Gmail&apos;inin
            Taslaklar klasörüne kaydedilir.
          </li>
          <li>
            <strong>Sohbetler:</strong> Yaver&apos;e yazdıkların ya da sesle söylediklerinin metni, Yaver&apos;in
            yanıtları ve bu yanıtları hazırlarken kullandığı araçların sonuçları.
          </li>
          <li>
            <strong>Yaver içindeki veriler:</strong> görevlerin, faturaların, onay bekleyen işlemler, sabah
            özetleri, hava durumu için seçtiğin şehir, araç izinlerin ve bildirim tercihlerin.
          </li>
          <li>
            <strong>Bildirimler:</strong> bildirimleri açtığın cihazların bildirim adresi ve tarayıcı bilgisi,
            gönderilen bildirimlerin kaydı.
          </li>
          <li>
            <strong>İşlem ve kullanım kayıtları:</strong> Yaver&apos;in hangi veriyi okuduğu ve hangi işlemi
            yaptığı (Güven Merkezi&apos;nde gördüğün işlem kaydı), planın ve günlük kullanım sayıların.
          </li>
          <li>
            <strong>Geri bildirimler:</strong> uygulama içinden gönderdiğin mesaj, türü, hangi sayfada olduğun ve
            tarayıcı bilgin.
          </li>
          <li>
            <strong>Beta bekleme listesi:</strong> listeye katılırken yazdığın e-posta adresi, isteğe bağlı adın ve
            notun. Yalnızca seni davet etmek için kullanılır; hesabın olmasa da silinmesini isteyebilirsin.
          </li>
        </ul>
        <p>
          <strong>Ses:</strong> Sesli komutlar tarayıcının konuşma tanıma özelliğiyle yazıya çevrilir; Yaver
          sunucularına ses kaydı gelmez, yalnızca ortaya çıkan metin gelir. Kullandığın tarayıcı (örneğin
          Chrome) sesi kendi hizmeti üzerinden işleyebilir; bu, tarayıcı üreticisinin gizlilik koşullarına
          tabidir.
        </p>
        <p>
          <strong>Özel nitelikli veriler:</strong> Yaver özel nitelikli kişisel veri (sağlık, inanç vb.)
          toplamayı amaçlamaz. Ancak takviminde ya da e-postalarında bu tür bilgiler bulunabilir ve sen bir
          işlem istediğinde okunabilir.
        </p>
      </Section>

      <Section title="3. Hangi amaçlarla işliyoruz">
        <ul>
          <li>Hesabını oluşturmak ve Google hesabınla güvenli giriş sağlamak,</li>
          <li>Sorularını yanıtlamak, gününü özetlemek, plan ve öneri hazırlamak,</li>
          <li>Onayladığın işlemleri (takvim etkinliği, e-posta taslağı) gerçekleştirmek,</li>
          <li>Faturalarını ve görevlerini takip etmek, istediğin bildirimleri göndermek,</li>
          <li>Plan limitlerini uygulamak, hizmetin güvenliğini sağlamak ve kötüye kullanımı önlemek,</li>
          <li>Beta davetlerini yönetmek ve geri bildirimlerinle hizmeti geliştirmek,</li>
          <li>Hangi verinin ne için kullanıldığını sana Güven Merkezi&apos;nde şeffaf biçimde göstermek.</li>
        </ul>
      </Section>

      <Section title="4. Hukuki sebepler">
        <p>
          Kişisel verilerin KVKK 5. madde kapsamında; hizmet sözleşmesinin kurulması ve ifası için gerekli
          olması (m. 5/2-c), hukuki yükümlülüklerimizin yerine getirilmesi (m. 5/2-ç) ve temel hak ve
          özgürlüklerine zarar vermemek kaydıyla hizmetin güvenliği gibi meşru menfaatlerimiz (m. 5/2-f)
          hukuki sebeplerine dayanılarak, otomatik yollarla işlenir.
        </p>
      </Section>

      <Section title="5. Kimlere aktarıyoruz">
        <p>Verilerin, yalnızca hizmeti sunmak için gereken ölçüde şu hizmet sağlayıcılarla paylaşılır:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — veritabanı ve kimlik doğrulama (verilerin burada saklanır).
          </li>
          <li>
            <strong>Vercel</strong> — uygulamanın barındırılması.
          </li>
          <li>
            <strong>Anthropic</strong> — yanıtları üreten yapay zekâ modeli (Claude). Bir isteği yanıtlamak için
            gereken içerik (mesajın, ilgili takvim ve e-posta bilgileri, fatura PDF&apos;leri) modele gönderilir.
            Web araştırması da Anthropic üzerinden yapılır.
          </li>
          <li>
            <strong>Google</strong> — Takvim ve Gmail erişimi senin Google hesabın üzerinden, Google&apos;ın
            arayüzleriyle yapılır.
          </li>
          <li>
            <strong>Open-Meteo</strong> — hava durumu için yalnızca şehir adı ve konum gönderilir; kimliğin
            gönderilmez.
          </li>
          <li>
            <strong>Tarayıcı bildirim servisleri</strong> (ör. Google, Apple, Mozilla) — açtığın bildirimlerin
            cihazına iletilmesi.
          </li>
        </ul>
        <p>
          Bu sağlayıcıların sunucuları Türkiye dışında bulunduğundan verilerin yurt dışına aktarılır. Aktarım
          KVKK 9. maddesine uygun olarak, Kurul&apos;un ilan ettiği standart sözleşmeler gibi uygun güvencelerle
          yapılır. Verilerini satmayız, reklam amacıyla kullanmayız ve kanunen yetkili kurumların talepleri
          dışında üçüncü kişilerle paylaşmayız.
        </p>
      </Section>

      <Section title="6. Google kullanıcı verileri">
        <p>
          Yaver&apos;in Google API&apos;lerinden aldığı bilgileri kullanması ve başka uygulamalara aktarması,
          Sınırlı Kullanım (Limited Use) gereksinimleri dahil olmak üzere{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Google API Hizmetleri Kullanıcı Verileri Politikası
          </a>
          &apos;na uyar. Buna göre:
        </p>
        <ul>
          <li>Google verilerini yalnızca sana Yaver&apos;in özelliklerini sunmak ve geliştirmek için kullanırız.</li>
          <li>Google verilerini reklam amacıyla kullanmayız, satmayız ve veri komisyoncularına aktarmayız.</li>
          <li>Google verilerini genel amaçlı yapay zekâ modellerinin eğitimi için kullanmayız ya da aktarmayız.</li>
          <li>
            Google verilerini, senin onayın olmadan, güvenlik amaçları, yasal yükümlülükler ya da verilerin
            anonim hale getirildiği durumlar dışında hiçbir insan okumaz.
          </li>
        </ul>
        <p>
          Yaver&apos;in Google hesabına erişimini istediğin an Güven Merkezi&apos;nden ya da{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            Google hesap izinleri
          </a>{" "}
          sayfasından kaldırabilirsin.
        </p>
      </Section>

      <Section title="7. Saklama süresi ve silme">
        <p>
          Verilerin hesabın açık olduğu sürece saklanır. Sohbetlerini Geçmiş sayfasından tek tek silebilirsin.
          Güven Merkezi&apos;ndeki &quot;Hesabımı ve verilerimi sil&quot; ile Google erişimi iptal edilir ve
          Yaver&apos;deki tüm verilerin (sohbetler, görevler, faturalar, ayarlar, işlem kayıtları ve hesabın)
          kalıcı olarak silinir. Silinen veriler, hizmet sağlayıcıların yedeklerinden yedekleme döngüleri
          içinde kendiliğinden kalkar. Gmail&apos;ine kaydedilmiş taslaklar ve takvimine eklenmiş etkinlikler
          senin Google hesabında kalır.
        </p>
      </Section>

      <Section title="8. Güvenlik">
        <ul>
          <li>Google erişim anahtarların yalnızca sunucuda tutulur ve tarayıcıya gönderilmez.</li>
          <li>Veritabanı kuralları her kullanıcının yalnızca kendi verisine erişmesine izin verir.</li>
          <li>Dış hesaplarında değişiklik yapan her işlem senin onayına bağlıdır ve kaydedilir.</li>
          <li>
            E-postalardaki ve web sayfalarındaki içerik yalnızca veri olarak ele alınır; içlerindeki
            talimatlar uygulanmaz.
          </li>
        </ul>
      </Section>

      <Section title="9. Çerezler ve tarayıcı depolama">
        <p>
          Yalnızca oturumunu açık tutmak için zorunlu çerezler kullanılır. Sesli yanıt tercihi gibi bazı cihaz
          ayarları tarayıcının yerel deposunda tutulur. Reklam ya da izleme çerezi kullanılmaz.
        </p>
      </Section>

      <Section title="10. KVKK kapsamındaki hakların">
        <p>KVKK 11. maddesi uyarınca;</p>
        <ul>
          <li>Kişisel verilerinin işlenip işlenmediğini öğrenme ve işlenmişse bilgi talep etme,</li>
          <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde ve yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>Eksik ya da yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>KVKK 7. maddesindeki şartlar çerçevesinde silinmesini ya da yok edilmesini isteme,</li>
          <li>Düzeltme ve silme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
          <li>
            Münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonuç çıkmasına itiraz etme,
          </li>
          <li>Kanuna aykırı işleme nedeniyle zarara uğrarsan zararın giderilmesini talep etme</li>
        </ul>
        <p>
          haklarına sahipsin. Başvurularını {LEGAL.email} adresine iletebilirsin. Başvurular en geç 30 gün
          içinde ücretsiz olarak sonuçlandırılır.
        </p>
      </Section>

      <Section title="11. Değişiklikler">
        <p>
          Bu metni güncelleyebiliriz. Önemli değişikliklerde Yaver içinde haber veririz. Güncel metin her
          zaman bu sayfadadır. Kullanım koşulları için <Link href="/kullanim-sartlari">Kullanım Şartları</Link>
          &apos;na bakabilirsin.
        </p>
      </Section>
    </LegalPage>
  );
}
