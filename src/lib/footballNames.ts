export type FootballLanguage = 'ru' | 'en';

// Common spellings override mechanical transliteration. Source Latin names remain
// unchanged in English; display names never change roster identities or aliases.
const spellings: Record<string, string> = {
  Eduard:'Эдуард', Eduardo:'Эдуардо', Erik:'Эрик', Eric:'Эрик', Emmanuel:'Эммануэль',
  Elvir:'Элвир', Edgar:'Эдгар', Edin:'Эдин', Eldar:'Эльдар', Adil:'Адиль',
  Mathieu:'Матьё', Valbuena:'Вальбуэна', Pierre:'Пьер', Odiah:'Одиа',
  John:'Джон', Jhon:'Джон', Chavez:'Чавес', Chávez:'Чавес',
  Kallstrom:'Чельстрём', Källström:'Чельстрём', Howedes:'Хёведес', Höwedes:'Хёведес',
  Ansaldi:'Ансальди', Jin:'Джин', Samuel:'Самюэль', Eto:'Это',
  Francois:'Франсуа', François:'Франсуа', Jiri:'Иржи', Jiří:'Иржи',
  Jarosik:'Ярошик', Jarošík:'Ярошик', Necid:'Нецид', Tomáš:'Томаш',
  Aleksandr:'Александр', Alexandr:'Александр', Alexander:'Александр', Aleksandar:'Александар',
  Alexey:'Алексей', Aleksey:'Алексей', Aleksei:'Алексей', Alexei:'Алексей', Alex:'Алекс',
  Andrey:'Андрей', Andrei:'Андрей', Andriy:'Андрей', Dmitriy:'Дмитрий', Dmitry:'Дмитрий', Dmitri:'Дмитрий',
  Sergey:'Сергей', Sergei:'Сергей', Sergej:'Сергей', Evgeniy:'Евгений', Evgeny:'Евгений', Evgeni:'Евгений', Yevgeni:'Евгений',
  Yuriy:'Юрий', Yuri:'Юрий', Yury:'Юрий', Georgiy:'Георгий', Georgi:'Георги', Giorgi:'Георгий', Giorgiy:'Георгий',
  Artem:'Артём', Artyom:'Артём', Artjom:'Артём', Fedor:'Фёдор', Fyodor:'Фёдор', Egor:'Егор', Yegor:'Егор',
  Ilya:'Илья', Ilja:'Илья', Igor:'Игорь', Mikhail:'Михаил', Maksim:'Максим', Maxim:'Максим',
  Vitaliy:'Виталий', Vitali:'Виталий', Vasiliy:'Василий', Vasili:'Василий', Vasily:'Василий',
  Anatoliy:'Анатолий', Anatoli:'Анатолий', Valeriy:'Валерий', Valeri:'Валерий', Nikolay:'Николай', Nikolai:'Николай',
  Vyacheslav:'Вячеслав', Viacheslav:'Вячеслав', Leonid:'Леонид', Matvey:'Матвей', Timofey:'Тимофей',
  Yaroslav:'Ярослав', Grigori:'Григорий', Grigoriy:'Григорий', German:'Герман', Yan:'Ян', Jan:'Ян',
  Ognjen:'Огнен', Dejan:'Деян', Bojan:'Боян', Nemanja:'Неманья', Zeljko:'Желько', Ljubomir:'Любомир',
  Drincic:'Дринчич', Drinčić:'Дринчич', Ivica:'Ивица', Ivitsa:'Ивица', Jovan:'Йован',
  Milan:'Милан', Marko:'Марко', Luka:'Лука', Nikola:'Никола', Dmytro:'Дмитрий', Oleksandr:'Александр',
  Joao:'Жоао', João:'Жоао', Jose:'Жозе', José:'Жозе', Luis:'Луис', Luiz:'Луиз',
  Lucas:'Лукас', Luciano:'Лусиано', Mauricio:'Маурисио', Maurício:'Маурисио',
  Thiago:'Тиаго', Tiago:'Тиагу', Charles:'Шарль', William:'Виллиан', Guilherme:'Гильерме',
  Jefferson:'Жефферсон', Jeffersons:'Жефферсонс', Jean:'Жан', Juan:'Хуан', Pedro:'Педро',
  Gabriel:'Габриэл', Ricardo:'Рикардо', Diego:'Диего', Cristian:'Кристиан', Christian:'Кристиан',
  Nicolas:'Николас', Nicolás:'Николас', Victor:'Виктор', Víctor:'Виктор', Felipe:'Фелипе',
  Philippe:'Филипп', Kevin:'Кевин', Luisão:'Луизао', André:'Андре', Andre:'Андре',
  Rafael:'Рафаэл', Douglas:'Дуглас', Henrique:'Энрике', Jailson:'Жаилсон',
  Ignatyev:'Игнатьев', Ignatiev:'Игнатьев', Iljin:'Ильин', Ilyin:'Ильин', Ilin:'Ильин',
  Semshov:'Семшов', Samedov:'Самедов', Zyrjanov:'Зырянов', Zyryanov:'Зырянов',
  Bystrov:'Быстров', Rybus:'Рыбус', Krychowiak:'Крыховяк', Grzegorz:'Гжегож',
  Guilhermo:'Гильермо', Guillermo:'Гильермо', Pereira:'Перейра', Pereyra:'Перейра',
  Nobrega:'Нобрега', Nóbrega:'Нобрега',
  Hulk:'Халк', Danny:'Данни', Welliton:'Веллитон', Vagner:'Вагнер', Love:'Лав',
  Wendel:'Вендел', Wanderson:'Вандерсон', Willian:'Виллиан',
  Ari:'Ари', Jô:'Жо', Jo:'Жо', Maicon:'Майкон', Doumbia:'Думбия', Seydou:'Сейду',
  McGeady:'Макгиди', Aiden:'Эйден', Emenike:'Эменике', Promes:'Промес', Quincy:'Квинси',
  Dzagoev:'Дзагоев', Arshavin:'Аршавин', Dzyuba:'Дзюба', Dzjuba:'Дзюба',
  Akinfeev:'Акинфеев', Akinfeyev:'Акинфеев', Ignashevich:'Игнашевич',
  Sychev:'Сычёв', Sychov:'Сычёв', Semenov:'Семёнов', Semyonov:'Семёнов',
  Bilyaletdinov:'Билялетдинов', Biljaletdinov:'Билялетдинов', Zhirkov:'Жирков',
  Shirokov:'Широков', Shishkin:'Шишкин', Schennikov:'Щенников', Shchennikov:'Щенников',
  Cheryshev:'Черышев',
  Kerzhakov:'Кержаков', Pavlyuchenko:'Павлюченко',
   Ryzhikov:'Рыжиков', Ryzantsev:'Рязанцев', Ryazantsev:'Рязанцев',
  Anyukov:'Анюков',  Denisov:'Денисов', Gabulov:'Габулов',
  Shunin:'Шунин', Smolov:'Смолов', Kokorin:'Кокорин', Fernandes:'Фернандес', Fernandez:'Фернандес',
  Erokhin:'Ерохин', Yerokhin:'Ерохин', Eschenko:'Ещенко', Eshchenko:'Ещенко',
  Malafeev:'Малафеев', Malafeyev:'Малафеев', Glushakov:'Глушаков', Dzhikiya:'Джикия', Dzhikia:'Джикия',
  Glushenkov:'Глушенков', Chepchugov:'Чепчугов', Dzhanaev:'Джанаев',
  Driussi:'Дриусси', Leandro:'Леандро', Paredes:'Паредес', Noboa:'Нобоа', Rondon:'Рондон', Rondón:'Рондон',
  Kuranyi:'Кураньи', Kurányi:'Кураньи', Boussoufa:'Буссуфа', Mbark:'Мубарак',
  Niasse:'Ниассе', Oumar:'Умар', Ahmed:'Ахмед', Musa:'Муса', Odemwingie:'Одемвингие',
  Peter:'Питер', Kranjcar:'Кранчар', Niko:'Нико', Tosic:'Тошич', Tošić:'Тошич',
  Wernbloom:'Вернблум', Pontus:'Понтус', Elm:'Эльм', Rasmus:'Расмус',
  Salvatore:'Сальваторе', Bocchetti:'Боккетти', Criscito:'Кришито', Domenico:'Доменико',
  Bruno:'Бруно', Alves:'Алвеш', Neto:'Нету', Garay:'Гарай', Ezequiel:'Эсекьель',
  Ivanovic:'Иванович', Ivanović:'Иванович', Branislav:'Бранислав', Corluka:'Чорлука', Ćorluka:'Чорлука',
  Vedran:'Ведран', Dujmovic:'Дуймович', Dujmović:'Дуймович', Kurban:'Курбан',
  Mvila:'Мвила', Yann:'Янн', Balazs:'Балаж', Balázs:'Балаж', Dzsudzsak:'Джуджак',
  Mbokani:'Мбокани', Dieumerci:'Дьёмерси', Natcho:'Натхо', Natkho:'Натхо', Bibras:'Бибрас',
  Rubin:'Рубин', Keisuke:'Кэйсукэ', Honda:'Хонда', Shinji:'Синдзи', Kagawa:'Кагава',
  Jano:'Жано', Ananidze:'Ананидзе', Hwang:'Хван', In:'Ин', Beom:'Бом',
   Salomon:'Саломон',
};

const nicknames: Record<string, string> = {
  'Vagner Love':'Вагнер Лав', 'Zé Luís':'Зе Луиш', 'Ze Luis':'Зе Луиш',
  'Luiz Adriano':'Луис Адриано', 'Carlos Eduardo':'Карлос Эдуардо',
  'Douglas Santos':'Дуглас Сантос', 'Rafael Carioca':'Рафаэл Кариока',
  'João Carlos':'Жоао Карлос',
  'Joao Carlos':'Жоао Карлос', 'Roberto Carlos':'Роберто Карлос',
};
const compositeNames = new Set(Object.entries(nicknames).flatMap(([en, ru]) => [en.toLowerCase(), ru.toLowerCase()]));
export function isFootballMononym(name: string) { return compositeNames.has(name.trim().toLowerCase()); }

const cyrillic: Record<string, string> = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
const latin: Record<string, string> = {a:'а',b:'б',c:'к',d:'д',e:'е',f:'ф',g:'г',h:'х',i:'и',j:'й',k:'к',l:'л',m:'м',n:'н',o:'о',p:'п',q:'к',r:'р',s:'с',t:'т',u:'у',v:'в',w:'в',x:'кс',y:'й',z:'з',æ:'э',ø:'ё',ł:'л',ß:'с',đ:'дж',ð:'д',þ:'т',ı:'и'};
const pairs: Record<string, string> = {shch:'щ',sch:'щ',dzh:'дж',zh:'ж',kh:'х',ch:'ч',sh:'ш',ts:'ц',th:'т',ph:'ф',yu:'ю',ju:'ю',ya:'я',ja:'я',yo:'ё',jo:'ё',ye:'е',je:'е',ck:'к',qu:'кв',iy:'ий',yy:'ый'};
const key = (s: string) => s.toLocaleLowerCase().replace(/ё/g,'е');
const ruOverrides = new Map(Object.entries({...spellings,...nicknames}).map(([en,ru])=>[key(en),ru]));
const enOverrides = new Map<string,string>();
for(const [en,ru] of Object.entries({...spellings,...nicknames})) if(!enOverrides.has(key(ru))) enOverrides.set(key(ru),en);
function titleCase(s: string) { return s ? s[0].toLocaleUpperCase()+s.slice(1) : s; }

export function localizePlayerName(value: string | null | undefined, language: FootballLanguage): string {
  if (!value) return '';
  const override = (language === 'ru' ? ruOverrides : enOverrides).get(key(value));
  if (override) return override;
  return value.split(/([\s\-’']+)/).map(token => {
    const match = (language === 'ru' ? ruOverrides : enOverrides).get(key(token));
    if (match) return match;
    if (language === 'en') {
      if (!/[А-Яа-яЁё]/.test(token)) return token;
      return titleCase([...token.toLowerCase()].map(c=>cyrillic[c]??c).join(''));
    }
    if (!/[A-Za-zÀ-ž]/.test(token)) return token;
    let result = token.replace(/č/gi,'ch').replace(/[ćç]/gi,'ch').replace(/š/gi,'sh').replace(/ž/gi,'zh').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/dj/g,'дж').replace(/ic$/,'ич').replace(/c(?=[ei])/g,'с').replace(/(?<=[bcdfghklmnpqrstvwxz])y$/g,'и');
    result = result.replace(/(?<=[bcdfghklmnpqrstvwxz])y(?=[bcdfghklmnpqrstvwxz])/g,'ы').replace(/shch|sch|dzh|zh|kh|ch|sh|ts|th|ph|yu|ju|ya|ja|yo|jo|ye|je|ck|qu|iy|yy/g, chunk=>pairs[chunk]);
    return titleCase([...result].map(c=>latin[c]??c).join(''));
  }).join('');
}
