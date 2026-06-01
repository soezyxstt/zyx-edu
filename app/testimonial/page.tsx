import type { Metadata } from "next";
import Image from "next/image";
import { MarketingPageHero } from "@/components/marketing-page-hero";
import { SectionContainer } from "@/components/layout/section-container";
import { Reveal } from "@/components/ui/reveal";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Testimonials"),
  description: "Testimoni singkat tutor dan murid Zyx Academy mengenai kualitas layanan dan pengalaman belajar.",
};

const stories = [
  {
    category: "Student Feedback",
    program: "MS'24",
    location: "Bandung",
    quote:
      "Belajar sama kak Adi beneran se asik dan se seru itu. Materi yang diajarin nya juga mudah buat dipahami :D. Di tambah kak Adi yang super sabar dan super baik buat ngajarin suatu hal pelan-pelan. pokoknya top tier respect besar bintang 5 :>!!!!",
    name: "Yomi Gita",
    avatarSrc: "/testimoni/yomi.jpeg",
  },
  {
    category: "Student Feedback",
    program: "GD'25",
    location: "Bandung",
    quote:
      "lowkey one of the best decisions belajar sm kak adi pas TPB ^^ vibesnya enak bgt, no judging at all, jadi gak takut salah atau ngerasa ‘kok gue bego yap’ tiap gak ngerti 😭 malah bikin aku lebih berani nanya belajar dan akhirnya paham... he really makes sure you actually learn, bukan cuma ngapalin soal dan catatan :D AND IT WORKS, dapet ip di atas 3 pas TPB ternyata possible aja dengan ilmu daging yang dikasih 🆒🆒 highly recommend buat yang mau survive TPB dngn sehat dan waras",
    name: "Agatha",
    avatarSrc: "/testimoni/agatha.jpeg",
  },
  {
    category: "Student Feedback",
    program: "TK'25",
    location: "Bandung",
    quote:
      "selama aku les bareng Kak Heidi itu ngebantu banget buat ngerti materi di kelas yang kadang masih bingung krn kak Heidi ngejelasinnya dengan cara yang simpel dan step by step, jd buat aku yg susah utk nyerap materi jadi lebih gampang nangkepnya😆",
    name: "Florence",
    avatarSrc: "/testimoni/florence.jpeg",
  },
  {
    category: "Student Feedback",
    program: "Mahasiswa TPB",
    location: "Bandung",
    quote:
      "Saya suka bagaimana modulnya tidak melompat ke soal sulit tanpa fondasi. Diskusi per minggu membantu menjaga ritme.",
    name: "Nadya",
    avatarSrc:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&h=900&fit=crop",
  },
  {
    category: "Student Feedback",
    program: "Teknik Industri",
    location: "Depok",
    quote:
      "Feedback untuk esai jelas; bagian objektif langsung terlihat di dashboard. Cocok untuk persiapan ujian praktik.",
    name: "Taufik",
    avatarSrc:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&h=900&fit=crop",
  },
  {
    category: "Tutor Perspective",
    program: "Pengajar Matematika",
    location: "Jakarta",
    quote:
      "Sebagai tutor, alur pengajarannya membantu murid fokus ke konsep yang sering jadi kesalahan klasik.",
    name: "Raka",
    avatarSrc:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=1200&h=900&fit=crop",
  },
  {
    category: "Parent Story",
    program: "Orang Tua Siswa SMA",
    location: "Bekasi",
    quote:
      "Progress report mingguannya ringkas dan mudah dibaca. Saya jadi tahu area mana yang perlu didampingi di rumah.",
    name: "Maya",
    avatarSrc:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1200&h=900&fit=crop",
  },
  {
    category: "Student Feedback",
    program: "SMA Kelas 12",
    location: "Surabaya",
    quote:
      "Kelasnya terstruktur dan materi rekamannya membantu saat saya ingin ulang topik yang belum paham.",
    name: "Adrian",
    avatarSrc:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&h=900&fit=crop",
  },
  {
    category: "Tutor Perspective",
    program: "Pengajar Fisika",
    location: "Yogyakarta",
    quote:
      "Template evaluasi dan rubriknya konsisten, jadi koreksi lebih cepat tanpa mengurangi kualitas feedback ke murid.",
    name: "Dina",
    avatarSrc:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&h=900&fit=crop",
  },
];

export default function TestimonialPage() {
  return (
    <div className="flex flex-col">
      <Reveal>
        <MarketingPageHero
          sectionId="testimonial"
          eyebrow="Zyx Academy"
          title="Testimoni"
          description="Cerita dari pengajar dan mahasiswa - transparansi proses adalah bagian dari kualitas layanan kami."
        />
      </Reveal>

      <Reveal>
      <SectionContainer
        className="border-b border-border bg-linear-to-b from-background via-muted/30 to-background"
        aria-labelledby="testimonial-grid-heading"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="testimonial-grid-heading" className="font-heading text-h5 text-foreground md:text-h4">
            Cerita nyata dari siswa, orang tua, dan tutor
          </h2>
          <p className="mt-3 text-body-base text-muted-foreground">
            Kami merancang pengalaman belajar yang terukur, nyaman, dan mudah dipantau. Ini beberapa cerita dari
            pengguna aktif Zyx Academy.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <article
              key={story.name + story.program}
              className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={story.avatarSrc}
                  alt={`Foto ${story.name}`}
                  width={48}
                  height={48}
                  className="size-12 rounded-full object-cover ring-1 ring-border"
                />
                <div className="min-w-0">
                  <p className="truncate font-heading text-body-base font-semibold text-foreground">{story.name}</p>
                  <p className="truncate text-body-sm text-muted-foreground">
                    {story.program} • {story.location}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-body-sm font-medium uppercase tracking-wide text-primary/80">{story.category}</p>
              <blockquote className="mt-2 flex-1 text-body-base leading-relaxed text-foreground/90">
                &ldquo;{story.quote}&rdquo;
              </blockquote>
            </article>
          ))}
          </div>
      </SectionContainer>
      </Reveal>
    </div>
  );
}
