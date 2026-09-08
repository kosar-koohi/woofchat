/**
 * UI language.
 *
 * This controls the interface only. What language the *answers* come back in
 * is decided by the model from the owner's own message -- someone can run the
 * app in English and still ask in Persian and be answered in Persian.
 *
 * Adding a language is data-only: add it to LANGUAGES and add a STRINGS entry.
 */

export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: Lang = "en";

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? "ltr";
}

/** Best guess from the browser, used only until the owner picks one. */
export function detectLang(): Lang {
  if (typeof navigator === "undefined") return DEFAULT_LANG;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    const hit = LANGUAGES.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return DEFAULT_LANG;
}

export type Dict = {
  newQuestion: string;
  yourDog: string;
  /** Lowercase form for mid-sentence use ("Ask about your dog."). */
  yourDogInline: string;
  addDog: string;
  editHint: string;
  today: string;
  earlier: string;
  askAbout: (name: string) => string;
  askAboutTitle: (name: string) => string;
  introBody: string;
  send: string;
  stop: string;
  starters: string[];

  disclaimerStrong: string;
  disclaimerRest: string;
  findVet: string;
  shareAnswer: string;

  saveImage: string;
  copyLink: string;
  rendering: string;
  saved: string;
  linkCopied: string;
  clipboardBlocked: string;
  renderFailed: string;
  shareTag: string;
  shareNote: string;

  profileTitle: string;
  profileHint: string;
  name: string;
  breed: string;
  breedTyped: string;
  age: string;
  ageYears: string;
  weight: string;
  sex: string;
  female: string;
  male: string;
  neutered: string;
  /** Possessive and object pronoun for the dog. Persian has one word for both. */
  poss: (sex?: "male" | "female") => string;
  obj: (sex?: "male" | "female") => string;
  homeOf: (poss: string) => string;
  whereYouLive: string;
  whoLooksAfter: (obj: string) => string;
  childrenAtHome: string;
  otherPets: string;
  anythingElse: string;
  notesPlaceholder: string;
  skip: string;
  save: string;

  onbTitle: string;
  onbBody: string;
  getStarted: string;
  skipForNow: string;
  theDog: string;
  theHousehold: string;
  back: string;
  continue: string;
  openChat: string;
  onbFine: string;

  homes: Record<string, string>;
  caregivers: Record<string, string>;
  children: Record<string, string>;
  pets: Record<string, string>;
  language: string;

  errRequestFailed: string;
  errLostConnection: string;
};

const en: Dict = {
  newQuestion: "New question",
  yourDog: "Your dog",
  yourDogInline: "your dog",
  addDog: "Add a dog",
  editHint: "double-click to edit",
  today: "Today",
  earlier: "Earlier",
  askAbout: (n) => `Ask about ${n}…`,
  askAboutTitle: (n) => `Ask about ${n}.`,
  introBody:
    "Answers use breed, age and weight. Not a substitute for your vet — for anything urgent, call one.",
  send: "Send",
  stop: "Stop",
  starters: ["Pulls on the leash", "How much to feed", "Barks at other dogs", "Crate at 4am"],

  disclaimerStrong: "Woofchat is a robot, not a veterinarian.",
  disclaimerRest:
    "Training answers are general. Anything urgent — pain, sudden change, trouble breathing — is a vet call, not a chat.",
  findVet: "Find a vet near me",
  shareAnswer: "Share this answer",

  saveImage: "Save image",
  copyLink: "Copy link",
  rendering: "Rendering…",
  saved: "Saved",
  linkCopied: "Link copied",
  clipboardBlocked: "Clipboard blocked by the browser.",
  renderFailed: "Could not render the image.",
  shareTag: "Ask about your dog",
  shareNote:
    "Written by a robot, not a veterinarian. If it looks like an emergency, call a vet.",

  profileTitle: "Your dog",
  profileHint:
    "All optional. The more you fill in, the more specific the answers. Stored on this device only.",
  name: "Name",
  breed: "Breed",
  breedTyped: "Breed, typed",
  age: "Age",
  ageYears: "Age (years)",
  weight: "Weight",
  sex: "Sex",
  female: "Female",
  male: "Male",
  neutered: "Neutered / spayed",
  poss: (sex) => (sex === "female" ? "her" : sex === "male" ? "his" : "their"),
  obj: (sex) => (sex === "female" ? "her" : sex === "male" ? "him" : "them"),
  homeOf: (poss) => `${poss} home`,
  whereYouLive: "Where you live",
  whoLooksAfter: (obj) => `Who looks after ${obj}`,
  childrenAtHome: "Children at home",
  otherPets: "Other pets",
  anythingElse: "Anything else worth knowing",
  notesPlaceholder: "Rescue, nervous around men, grain-free diet…",
  skip: "Skip",
  save: "Save",

  onbTitle: "Answers that fit your dog — and your home.",
  onbBody:
    "Breed, size and age shape the advice. So does an apartment, a toddler, or a cat in the hallway. Tell me once.",
  getStarted: "Get started",
  skipForNow: "Skip for now",
  theDog: "The dog",
  theHousehold: "The household",
  back: "Back",
  continue: "Continue",
  openChat: "Open the chat",
  onbFine: "A robot, not a veterinarian. For anything urgent, call a vet.",

  homes: { apartment: "Apartment", "house-yard": "House with a yard", rural: "Rural / farm" },
  caregivers: { "just-me": "Just me", shared: "Shared with others" },
  children: { none: "None", "under-5": "Under 5", "5-12": "5–12", teens: "Teens" },
  pets: { dog: "Another dog", cat: "A cat", none: "None" },
  language: "Language",

  errRequestFailed: "Request failed.",
  errLostConnection: "Lost the connection mid-answer.",
};

const fa: Dict = {
  newQuestion: "سؤال جدید",
  yourDog: "سگ شما",
  yourDogInline: "سگ شما",
  addDog: "افزودن سگ",
  editHint: "برای ویرایش دوبار کلیک کنید",
  today: "امروز",
  earlier: "پیش‌تر",
  askAbout: (n) => `درباره‌ی ${n} بپرسید…`,
  askAboutTitle: (n) => `درباره‌ی ${n} بپرسید.`,
  introBody:
    "جواب‌ها بر اساس نژاد، سن و وزن سگ شماست. جای دامپزشک را نمی‌گیرد — برای موارد فوری با دامپزشک تماس بگیرید.",
  send: "ارسال",
  stop: "توقف",
  starters: ["بند را می‌کشد", "چقدر غذا بدهم", "به سگ‌های دیگر پارس می‌کند", "۴ صبح بیدار می‌شود"],

  disclaimerStrong: "ووف‌چت یک ربات است، نه دامپزشک.",
  disclaimerRest:
    "این جواب‌ها کلی هستند. هر چیز فوری — درد، تغییر ناگهانی، مشکل تنفسی — کار دامپزشک است، نه چت.",
  findVet: "دامپزشک نزدیک من",
  shareAnswer: "اشتراک این جواب",

  saveImage: "ذخیره‌ی تصویر",
  copyLink: "کپی لینک",
  rendering: "در حال ساخت…",
  saved: "ذخیره شد",
  linkCopied: "لینک کپی شد",
  clipboardBlocked: "مرورگر اجازه‌ی کپی نداد.",
  renderFailed: "ساخت تصویر ممکن نشد.",
  shareTag: "درباره‌ی سگتان بپرسید",
  shareNote:
    "نوشته‌ی یک ربات، نه دامپزشک. اگر شبیه وضعیت اورژانسی است، با دامپزشک تماس بگیرید.",

  profileTitle: "سگ شما",
  profileHint:
    "همه اختیاری است. هرچه بیشتر پر کنید، جواب‌ها دقیق‌تر می‌شوند. فقط روی همین دستگاه ذخیره می‌شود.",
  name: "نام",
  breed: "نژاد",
  breedTyped: "نژاد، دستی",
  age: "سن",
  ageYears: "سن (سال)",
  weight: "وزن",
  sex: "جنسیت",
  female: "ماده",
  male: "نر",
  neutered: "عقیم‌شده",
  poss: () => "او",
  obj: () => "او",
  homeOf: (poss) => `خانه‌ی ${poss}`,
  whereYouLive: "کجا زندگی می‌کنید",
  whoLooksAfter: (obj) => `چه کسی از ${obj} مراقبت می‌کند`,
  childrenAtHome: "بچه در خانه",
  otherPets: "حیوان‌های دیگر",
  anythingElse: "چیز دیگری که خوب است بدانم",
  notesPlaceholder: "نجات‌یافته، با مردها مضطرب می‌شود، رژیم بدون غلات…",
  skip: "بی‌خیال",
  save: "ذخیره",

  onbTitle: "جواب‌هایی که با سگ شما و خانه‌تان جور است.",
  onbBody:
    "نژاد، اندازه و سن روی توصیه اثر می‌گذارند. آپارتمان، یک بچه‌ی نوپا یا گربه‌ای در راهرو هم همین‌طور. یک‌بار به من بگویید.",
  getStarted: "شروع کنیم",
  skipForNow: "فعلاً رد کن",
  theDog: "سگ",
  theHousehold: "خانه",
  back: "بازگشت",
  continue: "ادامه",
  openChat: "باز کردن چت",
  onbFine: "یک ربات، نه دامپزشک. برای موارد فوری با دامپزشک تماس بگیرید.",

  homes: { apartment: "آپارتمان", "house-yard": "خانه با حیاط", rural: "روستایی / مزرعه" },
  caregivers: { "just-me": "فقط خودم", shared: "مشترک با دیگران" },
  children: { none: "ندارم", "under-5": "زیر ۵ سال", "5-12": "۵ تا ۱۲ سال", teens: "نوجوان" },
  pets: { dog: "یک سگ دیگر", cat: "یک گربه", none: "ندارم" },
  language: "زبان",

  errRequestFailed: "درخواست ناموفق بود.",
  errLostConnection: "ارتباط وسط جواب قطع شد.",
};

const STRINGS: Record<Lang, Dict> = { en, fa };

export function strings(lang: Lang): Dict {
  return STRINGS[lang] ?? STRINGS[DEFAULT_LANG];
}
