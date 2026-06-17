export interface Poem {
  id: string;
  title: string;
  image: string;
  overlay?: string;
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
    overlay: "Ha festő volnék, megfesteném a szádat,\nDe előbb kékre-zöldre festeném a vásznat.\\\nAzután a hajadat szőkének,\nAz arcodat rózsásnak\nA ruhádat pirospettyesnek\nA karodat pelyhespuhának\nMégegyszer megnézném\nÉs az egészet összetépném.\nMert egy kép, bármi gyönyörű\nAz életből csak ellopott bánat.\nAz isten is festő volt.\nGyönyörűen megfestett téged.\nSzép fejet adott néked,Szép alakot, csodásat,\nJó hű szívet is, tüzességet,\nEgészséget, pirospozsgásat,\nÉs mégse jó a kép,\nMért szállnak a felhők\nÉs mért hervadnak el a jegenyék,\nHa nézlek,\nAz Isten is tudja ezt\nÉs összetép\nMeglátod, egyszer összetép."
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
];
