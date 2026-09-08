export type Language = 'es' | 'en';
export const localePath = (lang: Language) => lang === 'en' ? '/en/' : '/';
export const cvPath = (lang: Language) => `/CV_Francisco_Javier_Martinez_${lang.toUpperCase()}-public.pdf`;
export const pageCopy = {
  es: {
    title: 'Javi | Ingeniero de software',
    description: 'Soy Javi, ingeniero de software en Murcia. Desarrollo backend con Python, APIs y servicios cloud. Experiencia, proyectos y currículum.',
  },
  en: {
    title: 'Javi | Software engineer',
    description: "I'm Javi, a software engineer based in Murcia, Spain. Backend development with Python, APIs and cloud services. Experience, projects and résumé.",
  },
} satisfies Record<Language, { title: string; description: string }>;
