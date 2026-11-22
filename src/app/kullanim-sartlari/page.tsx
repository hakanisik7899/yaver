import Link from "next/link";
import { LEGAL } from "@/lib/legal/config";
import { PLAN_LIMITS } from "@/lib/plans/plans";
import { LegalPage, Section } from "../legal-page";

export const metadata = { title: "Kullanım Şartları · Yaver" };

export default function TermsPage() {
  return (
    <LegalPage title="Kullanım Şartları">
      <p>
        Bu şartlar, {LEGAL.controller} (&quot;biz&quot;) tarafından sunulan Yaver kişisel asistan hizmetinin
        (&quot;Yaver&quot;) kullanımını düzenler. Google ile giriş yaparak Yaver&apos;i kullandığında bu şartları
        kabul etmiş olursun. Kişisel verilerinin nasıl işlendiği{" "}
        <Link href="/gizlilik">Gizlilik Politikası ve KVKK Aydınlatma Metni</Link>&apos;nde anlatılır.
      </p>

      <Section title="1. Hizmet">
        <p>
          Yaver, bağladığın hesaplardaki bilgileri (Google Takvim, Pro planda Gmail) okuyarak gününü özetleyen,
          plan ve öneri hazırlayan ve senin onayladığın işlemleri yapan yapay zekâ destekli bir asistandır.
          Yaver şu an beta aşamasındadır; özellikler değişebilir, geçici kesintiler yaşanabilir.
        </p>
      </Section>

      <Section title="2. Hesap">
        <ul>
          <li>Yaver&apos;i kullanmak için 18 yaşını doldurmuş olman ve bir Google hesabın olması gerekir.</li>
          <li>Hesabının ve giriş yaptığın cihazların güvenliğinden sen sorumlusun.</li>
          <li>Yaver&apos;i yalnızca kendi hesaplarınla ya da kullanma yetkin olan hesaplarla kullanabilirsin.</li>
        </ul>
      </Section>

      <Section title="3. Yapay zekâ ve onay">
        <ul>
          <li>
            Yaver&apos;in yanıtları yapay zekâ tarafından üretilir ve hatalı ya da eksik olabilir. Önemli kararlar
            (ödemeler, randevular, resmi yazışmalar) öncesinde bilgileri kontrol etmelisin.
          </li>
          <li>
            Dış hesaplarında değişiklik yaratan her işlem (takvim etkinliği, Gmail taslağı) senin onayınla
            yapılır. Onayladığın işlemlerin sonuçlarından sen sorumlusun.
          </li>
          <li>
            Yaver senin adına e-posta göndermez ve ödeme yapmaz. Bir faturayı &quot;ödendi&quot; olarak
            işaretlemek yalnızca Yaver içindeki kaydı değiştirir.
          </li>
          <li>Görevlerin gibi yalnızca Yaver içinde tutulan bilgiler onay beklemeden güncellenebilir.</li>
        </ul>
      </Section>

      <Section title="4. Planlar ve kullanım limitleri">
        <ul>
          <li>
            <strong>Ücretsiz plan:</strong> günde {PLAN_LIMITS.free.messages} mesaj ve{" "}
            {PLAN_LIMITS.free.webSearches} web araştırması; takvim, görevler, sabah özeti ve hava durumu.
          </li>
          <li>
            <strong>Pro plan:</strong> günde {PLAN_LIMITS.pro.messages} mesaj ve {PLAN_LIMITS.pro.webSearches}{" "}
            web araştırması; ek olarak Gmail özellikleri (e-posta arama, fatura takibi, yanıt taslağı) ve
            proaktif bildirimler.
          </li>
          <li>Limitler her gün 00:00&apos;da (Türkiye saati) yenilenir.</li>
          <li>
            Ücretli abonelik başladığında fiyat, ödeme, cayma ve iptal koşulları satın alma öncesinde ayrıca
            bildirilir.
          </li>
        </ul>
      </Section>

      <Section title="5. Kabul edilemez kullanım">
        <p>Yaver&apos;i şu amaçlarla kullanamazsın:</p>
        <ul>
          <li>Yasalara aykırı işler, dolandırıcılık, taciz ya da başkalarının haklarını ihlal etmek,</li>
          <li>Başkasının hesabına izinsiz erişmek ya da başkasının verisini izinsiz işlemek,</li>
          <li>Limitleri aşmaya, sistemin güvenliğini aşmaya ya da hizmeti aksatmaya çalışmak,</li>
          <li>Hizmeti otomatik araçlarla toplu kullanmak ya da başkalarına yeniden satmak.</li>
        </ul>
        <p>Bu durumlarda hesabını askıya alabilir ya da kapatabiliriz.</p>
      </Section>

      <Section title="6. Üçüncü taraf hizmetler">
        <p>
          Yaver; Google, Anthropic, Supabase ve Vercel gibi üçüncü taraf hizmetlerle çalışır. Bu hizmetlerdeki
          kesinti ya da değişiklikler Yaver&apos;i etkileyebilir. Google hesabının kullanımı Google&apos;ın kendi
          koşullarına tabidir.
        </p>
      </Section>

      <Section title="7. Sorumluluğun sınırı">
        <p>
          Hizmeti özenle sunmaya çalışırız ancak kesintisiz ya da hatasız olacağını garanti edemeyiz. Kasıt ve
          ağır ihmal halleri ile tüketici mevzuatının zorunlu hükümleri saklı kalmak üzere; yapay zekâ
          yanıtlarındaki hatalardan, kaçırılan son ödeme tarihlerinden ya da senin onayladığın işlemlerin
          sonuçlarından doğan dolaylı zararlardan sorumlu değiliz.
        </p>
      </Section>

      <Section title="8. Hesabın kapatılması">
        <p>
          Hesabını istediğin an Güven Merkezi&apos;ndeki &quot;Hesabımı ve verilerimi sil&quot; ile kapatabilirsin;
          Google erişimi iptal edilir ve Yaver&apos;deki verilerin kalıcı olarak silinir.
        </p>
      </Section>

      <Section title="9. Değişiklikler">
        <p>
          Bu şartları güncelleyebiliriz. Önemli değişikliklerde Yaver içinde haber veririz; değişiklikten sonra
          kullanmaya devam etmen güncel şartları kabul ettiğin anlamına gelir.
        </p>
      </Section>

      <Section title="10. Uygulanacak hukuk ve iletişim">
        <p>
          Bu şartlara Türkiye Cumhuriyeti hukuku uygulanır. Tüketici sıfatıyla yaşadığın uyuşmazlıklarda,
          mevzuatta belirlenen parasal sınırlar dahilinde tüketici hakem heyetlerine, bu sınırları aşan
          durumlarda tüketici mahkemelerine başvurabilirsin. Soruların için: {LEGAL.email}
        </p>
      </Section>
    </LegalPage>
  );
}
