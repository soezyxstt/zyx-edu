export type TestimonialStory = {
  id: string;
  name: string;
  program: string;
  location: string;
  category: string;
  avatarSrc: string;
  quote: string;
};

export const testimonialStories = [
  {
    id: "yomi",
    name: "Yomi Gita",
    program: "MS'24",
    location: "Bandung",
    category: "Cerita siswa",
    avatarSrc: "/testimoni/yomi.jpeg",
    quote:
      "Belajar sama kak Adi beneran se asik dan se seru itu. Materi yang diajarin nya juga mudah buat dipahami :D. Di tambah kak Adi yang super sabar dan super baik buat ngajarin suatu hal pelan-pelan. pokoknya top tier respect besar bintang 5 :>!!!!",
  },
  {
    id: "agatha",
    name: "Agatha",
    program: "GD'25",
    location: "Bandung",
    category: "Cerita siswa",
    avatarSrc: "/testimoni/agatha.jpeg",
    quote:
      "lowkey one of the best decisions belajar sm kak adi pas TPB ^^ vibesnya enak bgt, no judging at all, jadi gak takut salah atau ngerasa ‘kok gue bego yap’ tiap gak ngerti 😭 malah bikin aku lebih berani nanya belajar dan akhirnya paham... he really makes sure you actually learn, bukan cuma ngapalin soal dan catatan :D AND IT WORKS, dapet ip di atas 3 pas TPB ternyata possible aja dengan ilmu daging yang dikasih 🆒🆒 highly recommend buat yang mau survive TPB dngn sehat dan waras",
  },
  {
    id: "florence",
    name: "Florence",
    program: "TK'25",
    location: "Bandung",
    category: "Cerita siswa",
    avatarSrc: "/testimoni/florence.jpeg",
    quote:
      "selama aku les bareng Kak Heidi itu ngebantu banget buat ngerti materi di kelas yang kadang masih bingung krn kak Heidi ngejelasinnya dengan cara yang simpel dan step by step, jd buat aku yg susah utk nyerap materi jadi lebih gampang nangkepnya😆",
  },
] satisfies TestimonialStory[];
