export interface Poem {
  id: string;
  title: string;
  image: string;
  overlay?: string;
  featured?: boolean;
  deleted?: boolean;
}

export const POEMS: Poem[] = [
  {
    id: "poem-1",
    title: "Éj",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png",
    overlay: "Kék hold virágsziromban ül,\nS evez, evez…\nItt-ott megcsobban az ég véletlenül.\n\nA faluban ugatnak a kutyák,\nHázak mellett fekete fák\nmelle piheg.\n\nA toronyra egy fantom települ,\nA holdra vigyorog és piheg,\nnagy nyelve szürcsöli a fényt,\nFarkával a szíved veri,\nDe ne szólj senkinek."
  },
  { id: "poem-2",
    title: "Ősz",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png",
    overlay: "Télkirály ismét talpon, készül\nA hegyekb˝ol lejönni újra\nS mert nem telik levélpapírra,\nFalevelet küld szét, velük üzen.\n\nNehéz nagy es˝o veri a tájat,\nAz emberek máris köhögnek,\nA felh˝okben a nyár sír, szíve fájhat\nMint az eke az ˝oszi rögöknek.\n\nS valami nagy-nagy bánat suhan át\nA füveken, szíveken és a fákon:\nÖrökre elaltathat mindent,\nHa ilyen mohón itatja mag"
  },
  { id: "poem-3", 
    title: "Temps perdu",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png",
    overlay: "Ha festő volnék, megfesteném a szádat,\nDe előbb kékre-zöldre festeném a vásznat.\nAzután a hajadat szőkének,\nAz arcodat rózsásnak\nA ruhádat pirospettyesnek\nA karodat pelyhespuhának\nMégegyszer megnézném\nÉs az egészet összetépném.\nMert egy kép, bármi gyönyörű\nAz életből csak ellopott bánat.\nAz isten is festő volt.\nGyönyörűen megfestett téged.\nSzép fejet adott néked,Szép alakot, csodásat,\nJó hű szívet is, tüzességet,\nEgészséget, pirospozsgásat,\nÉs mégse jó a kép,\nMért szállnak a felhők\nÉs mért hervadnak el a jegenyék,\nHa nézlek,\nAz Isten is tudja ezt\nÉs összetép\nMeglátod, egyszer összetép."
  },
  { id: "poem-4",
    title: "Kaposszentbenedek",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png",
    overlay: "(Az én falum)\nMint barna tehén áll a völgyben,\nHátát a dombhoz dörgöli,\nLába előtt Balatonig gurul a sík…\nFüzek tündérhadától visszadöbben,\nDe a patakból még egyet iszik\nS csak áll, csak áll: földbegyökerezett a lába:\nSzelíd fejét bearanyozzák\nSugarai a tűnő nyárnak,\nKis borjai meleg tejére visszajárnak,\nHa beballag a csillagmécses éjszakába."
  },
    { id: "poem-5",
    title: "Körforgás: Ősz",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698309/1000008590_LE_upscale_strong_x4_do7epy.png",
    overlay: "A sombokrokon\nPárás, lila nyom,\nAz erd˝ok olyan beteltek\nÉs cseng kopog a lombokon.\nDe messze túl\nHol kissé alkonyul\nSzüret áll és ez a tied,\nKövér sz˝ol˝ogerezdek\nTeste puttonyban reszket,\nValahol\nÓ ifjúságod újbora forr."
  },
    {
    id: "poem-6",
    title: "Éj",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png",
    overlay: "Kék hold virágsziromban ül,\nS evez, evez…\nItt-ott megcsobban az ég véletlenül.\n\nA faluban ugatnak a kutyák,\nHázak mellett fekete fák\nmelle piheg.\n\nA toronyra egy fantom települ,\nA holdra vigyorog és piheg,\nnagy nyelve szürcsöli a fényt,\nFarkával a szíved veri,\nDe ne szólj senkinek."
  },
  { id: "poem-7",
    title: "Ősz",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png",
    overlay: "Télkirály ismét talpon, készül\nA hegyekb˝ol lejönni újra\nS mert nem telik levélpapírra,\nFalevelet küld szét, velük üzen.\n\nNehéz nagy es˝o veri a tájat,\nAz emberek máris köhögnek,\nA felh˝okben a nyár sír, szíve fájhat\nMint az eke az ˝oszi rögöknek.\n\nS valami nagy-nagy bánat suhan át\nA füveken, szíveken és a fákon:\nÖrökre elaltathat mindent,\nHa ilyen mohón itatja mag"
  },
  { id: "poem-8", 
    title: "Temps perdu",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png",
    overlay: "Ha festő volnék, megfesteném a szádat,\nDe előbb kékre-zöldre festeném a vásznat.\nAzután a hajadat szőkének,\nAz arcodat rózsásnak\nA ruhádat pirospettyesnek\nA karodat pelyhespuhának\nMégegyszer megnézném\nÉs az egészet összetépném.\nMert egy kép, bármi gyönyörű\nAz életből csak ellopott bánat.\nAz isten is festő volt.\nGyönyörűen megfestett téged.\nSzép fejet adott néked,Szép alakot, csodásat,\nJó hű szívet is, tüzességet,\nEgészséget, pirospozsgásat,\nÉs mégse jó a kép,\nMért szállnak a felhők\nÉs mért hervadnak el a jegenyék,\nHa nézlek,\nAz Isten is tudja ezt\nÉs összetép\nMeglátod, egyszer összetép."
  },
  { id: "poem-9",
    title: "Kaposszentbenedek",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png",
    overlay: "(Az én falum)\nMint barna tehén áll a völgyben,\nHátát a dombhoz dörgöli,\nLába előtt Balatonig gurul a sík…\nFüzek tündérhadától visszadöbben,\nDe a patakból még egyet iszik\nS csak áll, csak áll: földbegyökerezett a lába:\nSzelíd fejét bearanyozzák\nSugarai a tűnő nyárnak,\nKis borjai meleg tejére visszajárnak,\nHa beballag a csillagmécses éjszakába."
  },
    { id: "poem-10",
    title: "Körforgás: Ősz",
    image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698309/1000008590_LE_upscale_strong_x4_do7epy.png",
    overlay: "A sombokrokon\nPárás, lila nyom,\nAz erd˝ok olyan beteltek\nÉs cseng kopog a lombokon.\nDe messze túl\nHol kissé alkonyul\nSzüret áll és ez a tied,\nKövér sz˝ol˝ogerezdek\nTeste puttonyban reszket,\nValahol\nÓ ifjúságod újbora forr."
  },
  { id: "poem-11", title: "Éj", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png", overlay: "Kék hold virágsziromban ül,\nS evez, evez…\nItt-ott megcsobban az ég véletlenül.\n\nA faluban ugatnak a kutyák,\nHázak mellett fekete fák\nmelle piheg." },
  { id: "poem-12", title: "Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png", overlay: "Télkirály ismét talpon, készül\nA hegyekből lejönni újra\nS mert nem telik levélpapírra,\nFalevelet küld szét, velük üzen." },
  { id: "poem-13", title: "Temps perdu", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png", overlay: "Ha festő volnék, megfesteném a szádat,\nDe előbb kékre-zöldre festeném a vásznat.\nAzután a hajadat szőkének,\nAz arcodat rózsásnak." },
  { id: "poem-14", title: "Kaposszentbenedek", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png", overlay: "Mint barna tehén áll a völgyben,\nHátát a dombhoz dörgöli,\nLába előtt Balatonig gurul a sík…" },
  { id: "poem-15", title: "Körforgás: Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698309/1000008590_LE_upscale_strong_x4_do7epy.png", overlay: "A sombokrokon\nPárás, lila nyom,\nAz erdők olyan beteltek\nÉs cseng kopog a lombokon." },
  { id: "poem-16", title: "Éj", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png", overlay: "A toronyra egy fantom települ,\nA holdra vigyorog és piheg,\nnagy nyelve szürcsöli a fényt,\nFarkával a szíved veri,\nDe ne szólj senkinek." },
  { id: "poem-17", title: "Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png", overlay: "S valami nagy-nagy bánat suhan át\nA füveken, szíveken és a fákon:\nÖrökre elaltathat mindent." },
  { id: "poem-18", title: "Temps perdu", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png", overlay: "Mért szállnak a felhők\nÉs mért hervadnak el a jegenyék,\nHa nézlek,\nAz Isten is tudja ezt\nÉs összetép." },
  { id: "poem-19", title: "Kaposszentbenedek", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png", overlay: "Szelíd fejét bearanyozzák\nSugarai a tűnő nyárnak,\nKis borjai meleg tejére visszajárnak,\nHa beballag a csillagmécses éjszakába." },
  { id: "poem-20", title: "Körforgás: Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698309/1000008590_LE_upscale_strong_x4_do7epy.png", overlay: "De messze túl\nHol kissé alkonyul\nSzüret áll és ez a tied,\nKövér szőlőgerezdek\nTeste puttonyban reszket." },
  { id: "poem-21", title: "Éj", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png", overlay: "Kék hold virágsziromban ül,\nS evez, evez…\nItt-ott megcsobban az ég véletlenül." },
  { id: "poem-22", title: "Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png", overlay: "Nehéz nagy eső veri a tájat,\nAz emberek máris köhögnek,\nA felhőkben a nyár sír, szíve fájhat." },
  { id: "poem-23", title: "Temps perdu", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png", overlay: "Szép fejet adott néked, szép alakot, csodásat,\nJó hű szívet is, tüzességet,\nEgészséget, pirospozsgásat." },
  { id: "poem-24", title: "Kaposszentbenedek", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png", overlay: "Füzek tündérhadától visszadöbben,\nDe a patakból még egyet iszik\nS csak áll, csak áll: földbegyökerezett a lába." },
  { id: "poem-25", title: "Éj", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png", overlay: "Kék hold virágsziromban ül,\nS evez, evez…\nItt-ott megcsobban az ég véletlenül.\n\nA faluban ugatnak a kutyák." },
  { id: "poem-26", title: "Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png", overlay: "Télkirály ismét talpon, készül\nA hegyekből lejönni újra\nS mert nem telik levélpapírra,\nFalevelet küld szét, velük üzen.\n\nNehéz nagy eső veri a tájat." },
  { id: "poem-27", title: "Temps perdu", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png", overlay: "Ha festő volnék, megfesteném a szádat,\nDe előbb kékre-zöldre festeném a vásznat.\nMégegyszer megnézném\nÉs az egészet összetépném." },
  { id: "poem-28", title: "Körforgás: Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698309/1000008590_LE_upscale_strong_x4_do7epy.png", overlay: "A sombokrokon\nPárás, lila nyom,\nAz erdők olyan beteltek\nÉs cseng kopog a lombokon.\n\nValahol\nÓ ifjúságod újbora forr." },
  { id: "poem-29", title: "Kaposszentbenedek", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698310/1000008715_LE_strong_x4_w9indy.png", overlay: "Mint barna tehén áll a völgyben,\nHátát a dombhoz dörgöli,\nLába előtt Balatonig gurul a sík…\nSzelíd fejét bearanyozzák\nSugarai a tűnő nyárnak." },
  { id: "poem-30", title: "Éj", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781698311/1000008717_LE_strong_x4_mjdwp5.png", overlay: "A toronyra egy fantom települ,\nA holdra vigyorog és piheg,\nnagy nyelve szürcsöli a fényt." },
  { id: "poem-31", title: "Ősz", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781703377/1000008714_LE_strong_x4_yamyzk.png", overlay: "S valami nagy-nagy bánat suhan át\nA füveken, szíveken és a fákon:\nÖrökre elaltathat mindent,\nHa ilyen mohón itatja mag." },
  { id: "poem-32", title: "Temps perdu", image: "https://res.cloudinary.com/dgk299isx/image/upload/v1781699336/1000008716_LE_ultra_custom_kcfcsj.png", overlay: "Mert egy kép, bármi gyönyörű\nAz életből csak ellopott bánat.\nAz isten is festő volt.\nGyönyörűen megfestett téged." },
];
