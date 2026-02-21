export type TestExplanation = {
  test: string;
  aliases?: string[];
  oneLineSummary: string;
  whatIsIt: string[];
  high: string[];
  low: string[];
  tips: string[];
  related: string[];
};

function normalizeTestKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

const TEST_EXPLANATIONS: TestExplanation[] = [
  {
    test: "비중",
    aliases: ["Urine SG", "Specific Gravity", "Urine Specific Gravity"],
    oneLineSummary: "소변이 얼마나 ‘진한지/묽은지’를 보여줘요.",
    whatIsIt: [
      "소변 속 물의 농도(희석/농축 정도)를 보는 값이에요.",
      "수분 상태나 신장이 소변을 농축하는 능력과 관련이 있어요."
    ],
    high: [
      "물을 덜 마셨거나 땀/설사/구토 등으로 ‘탈수’일 때",
      "소변에 포도당·단백질 같은 물질이 많아져 ‘진해’ 보일 때"
    ],
    low: [
      "물을 많이 마셔서 소변이 ‘묽어’졌을 때",
      "이뇨제 사용, 또는 신장이 소변을 충분히 농축하지 못할 때"
    ],
    tips: ["채뇨 시점(아침/낮), 수분 섭취량에 따라 쉽게 흔들려요. ‘추세’로 보는 게 좋아요."],
    related: ["산도", "크레아티닌(소변)", "단백/크레아티닌 비(소변)"]
  },
  {
    test: "산도",
    aliases: ["Urine pH", "pH"],
    oneLineSummary: "소변이 산성인지(낮음) 알칼리성인지(높음) 보는 값이에요.",
    whatIsIt: ["소변 pH로, 몸의 대사·식이·감염·약물 영향이 반영될 수 있어요."],
    high: ["채소 위주 식단, 구토(위산 손실), 일부 요로감염(세균 종류에 따라) 등"],
    low: ["고단백 식단, 탈수, 케톤 증가(단식/당조절 문제 등) 같은 상황"],
    tips: ["식사/약/감염 여부에 따라 변동이 커요. pH 하나만으로 ‘이상’ 판단은 어려워요."],
    related: ["비중", "Protein, Random Urine", "CRP (C-반응성 단백)"]
  },
  {
    test: "Protein, Random Urine",
    aliases: ["Random Urine Protein", "Protein Urine", "소변 단백"],
    oneLineSummary: "소변으로 단백질이 얼마나 새는지 보는 지표예요.",
    whatIsIt: [
      "정상이라면 소변 단백은 ‘아주 적거나 거의 없음’이 흔해요.",
      "신장 ‘필터(사구체)’에 문제가 있으면 단백질이 소변으로 새어 나올 수 있어요."
    ],
    high: [
      "일시적: 격한 운동, 탈수, 열/스트레스 등으로 잠깐 올라갈 수 있어요.",
      "지속적: 신장 질환(단백뇨) 가능성을 확인해야 해요."
    ],
    low: ["대체로 좋은 의미예요(‘음성/미량’도 흔해요)."],
    tips: ["랜덤 소변 단백은 들쑥날쑥할 수 있어요. 보통 ‘단백/크레아티닌 비(소변)’와 같이 보고 추세를 봐요."],
    related: ["단백/크레아티닌 비(소변)", "크레아티닌(소변)", "eGFR (추정 사구체여과율)"]
  },
  {
    test: "크레아티닌(소변)",
    aliases: ["Creatinine, Random Urine", "Random Urine Creatinine", "Urine Creatinine"],
    oneLineSummary: "소변의 ‘농도 보정’에 자주 쓰이는 기준값이에요.",
    whatIsIt: [
      "크레아티닌은 근육에서 자연스럽게 생기는 노폐물이에요.",
      "소변이 얼마나 ‘농축/희석’됐는지 가늠하는 데도 쓰여요."
    ],
    high: [
      "소변이 진하게 나온 경우(수분 섭취 적음 등)",
      "근육량/운동/채뇨 조건에 따라 달라질 수 있어요."
    ],
    low: [
      "소변이 묽게 나온 경우(물을 많이 마셨거나 이뇨 상태)",
      "근육량이 적으면 전반적으로 낮게 나올 수 있어요."
    ],
    tips: ["이 값 단독보다 ‘단백/크레아티닌 비(소변)’처럼 비율로 보는 경우가 많아요."],
    related: ["Protein, Random Urine", "단백/크레아티닌 비(소변)", "Creatinine (크레아티닌)"]
  },
  {
    test: "단백/크레아티닌 비(소변)",
    aliases: ["Protein/Creatinine Ratio, Urine", "Urine Protein Creatinine Ratio", "UPCR"],
    oneLineSummary: "소변 단백질을 소변 크레아티닌으로 나눠 ‘단백뇨 정도’를 가늠해요.",
    whatIsIt: ["랜덤 소변이라도 ‘소변이 진했는지/묽었는지’ 영향을 어느 정도 보정해줘요."],
    high: ["단백뇨가 있거나(신장 필터 손상 등), 일시적으로 단백이 늘어난 상황일 수 있어요."],
    low: ["대체로 좋은 의미(단백이 적게 샌다는 뜻)예요."],
    tips: ["하루 중 변동이 있을 수 있어요. ‘한 번의 수치’보다 ‘반복 측정 추세’가 더 중요해요."],
    related: ["Protein, Random Urine", "eGFR (추정 사구체여과율)", "Creatinine (크레아티닌)"]
  },
  {
    test: "백혈구 (WBC)",
    aliases: ["WBC", "White Blood Cell"],
    oneLineSummary: "감염·염증·면역 상태를 보여주는 ‘백혈구 총량’이에요.",
    whatIsIt: ["백혈구는 우리 몸을 지키는 면역세포들이에요.", "WBC는 그 ‘전체 숫자’를 의미해요."],
    high: [
      "감염/염증, 스트레스(격한 운동 포함), 스테로이드 약 영향 등",
      "드물게 혈액질환과 연관될 수 있어요(다른 지표와 함께 해석)."
    ],
    low: [
      "바이러스 감염, 일부 약(항암제 등), 골수 기능 저하 등",
      "너무 낮으면 감염에 취약해질 수 있어요."
    ],
    tips: ["WBC만 보지 말고, ‘감별검사(호중구/림프구 비율)’와 같이 보면 힌트가 많아요."],
    related: ["호중구 (Seg. neutrophil)", "림프구 (Lymphocyte)", "CRP (C-반응성 단백)"]
  },
  {
    test: "적혈구 (RBC)",
    aliases: ["RBC", "Red Blood Cell"],
    oneLineSummary: "산소를 나르는 ‘적혈구의 개수’를 뜻해요.",
    whatIsIt: ["적혈구는 몸 곳곳에 산소를 전달해요."],
    high: ["탈수(혈액이 농축됨), 흡연/고지대 생활, 일부 폐·심장 질환 등"],
    low: ["빈혈(영양결핍 포함), 출혈, 만성질환 등"],
    tips: ["RBC는 ‘혈색소/헤마토크리트’와 같이 봐야 빈혈/농축 여부가 더 잘 보여요."],
    related: ["혈색소 (헤모글로빈)", "헤마토크리트 (Hct)", "망상 적혈구"]
  },
  {
    test: "혈색소 (헤모글로빈)",
    aliases: ["Hemoglobin", "Hgb", "혈색소"],
    oneLineSummary: "산소 운반 단백질(헤모글로빈) 양이에요.",
    whatIsIt: ["헤모글로빈은 적혈구 안에서 산소를 붙잡아 운반해요."],
    high: ["탈수, 적혈구가 실제로 많아지는 상태 등"],
    low: ["빈혈(철분·B12·엽산 부족, 출혈, 만성질환 등)"],
    tips: ["증상(피로, 어지러움 등) + RBC/Hct + 철분 관련 검사와 함께 봐요."],
    related: ["헤마토크리트 (Hct)", "MCV", "망상 적혈구"]
  },
  {
    test: "헤마토크리트 (Hct)",
    aliases: ["Hematocrit", "Hct"],
    oneLineSummary: "혈액에서 ‘적혈구가 차지하는 비율(%)’이에요.",
    whatIsIt: ["피가 ‘얼마나 농축/희석’됐는지에도 영향을 받아요."],
    high: ["탈수(혈액 농축), 적혈구 증가 상태 등"],
    low: ["빈혈, 출혈, 수분 과다(희석) 등"],
    tips: ["수분 상태에 따라 흔들릴 수 있어요. RBC/헤모글로빈과 같이 보세요."],
    related: ["혈색소 (헤모글로빈)", "적혈구 (RBC)", "비중"]
  },
  {
    test: "평균 적혈구 용적 (MCV)",
    aliases: ["MCV", "Mean Corpuscular Volume"],
    oneLineSummary: "적혈구 ‘크기’의 평균이에요.",
    whatIsIt: ["빈혈이 있을 때 ‘작은 적혈구/큰 적혈구’인지 분류하는 데 도움돼요."],
    high: ["비타민 B12/엽산 부족, 간질환, 음주, 일부 약물 등"],
    low: ["철결핍, 지중해빈혈 같은 ‘작은 적혈구’ 상태 등"],
    tips: ["MCV는 MCH/MCHC, 철분·B12 검사와 같이 보면 해석이 쉬워요."],
    related: ["평균 적혈구 혈색소량 (MCH)", "평균 적혈구 혈색소 농도 (MCHC)", "혈색소 (헤모글로빈)"]
  },
  {
    test: "평균 적혈구 혈색소량 (MCH)",
    aliases: ["MCH", "Mean Corpuscular Hemoglobin"],
    oneLineSummary: "적혈구 1개에 들어있는 헤모글로빈 ‘양’이에요.",
    whatIsIt: ["적혈구가 산소를 얼마나 담고 있는지의 단서가 돼요."],
    high: ["적혈구가 큰 경우(MCV↑)와 같이 움직이는 경우가 많아요."],
    low: ["철결핍 등으로 적혈구가 ‘덜 붉고(헤모글로빈 적고)’ 작을 때"],
    tips: ["MCH는 MCV/MCHC와 세트로 보면 이해가 쉬워요."],
    related: ["평균 적혈구 용적 (MCV)", "평균 적혈구 혈색소 농도 (MCHC)", "혈색소 (헤모글로빈)"]
  },
  {
    test: "평균 적혈구 혈색소 농도 (MCHC)",
    aliases: ["MCHC", "Mean Corpuscular Hemoglobin Concentration"],
    oneLineSummary: "적혈구 안의 헤모글로빈 ‘농도’를 뜻해요.",
    whatIsIt: ["같은 적혈구라도 헤모글로빈이 ‘빽빽하게’ 들어있는지 보는 느낌이에요."],
    high: [
      "드물게 적혈구 모양/파괴(용혈) 관련 상황에서 올라갈 수 있어요.",
      "가끔은 검사 조건(표본 상태 등) 영향도 받을 수 있어요."
    ],
    low: ["철결핍 등에서 ‘헤모글로빈이 덜 찬 적혈구’일 때"],
    tips: ["단독 해석보다 MCV/MCH와 같이 보는 게 안전해요."],
    related: ["평균 적혈구 용적 (MCV)", "평균 적혈구 혈색소량 (MCH)", "혈색소 (헤모글로빈)"]
  },
  {
    test: "혈소판 (platelet)",
    aliases: ["Platelet", "PLT", "혈소판"],
    oneLineSummary: "피가 멈추는 과정(지혈)에 중요한 ‘혈소판 수’예요.",
    whatIsIt: ["상처가 났을 때 피가 잘 멈추게 도와주는 세포 조각이에요."],
    high: ["염증/감염 후, 철결핍, 수술/출혈 후 회복기 등에서 올라갈 수 있어요."],
    low: ["바이러스 감염, 일부 약물, 면역 문제, 간질환/비장 영향 등 다양한 원인이 있어요."],
    tips: ["멍이 잘 들거나 코피/잇몸출혈이 잦다면 의료진과 빠르게 상의가 좋아요."],
    related: ["PT(INR)", "CRP (C-반응성 단백)", "프로트롬빈 시간"]
  },
  {
    test: "망상 적혈구",
    aliases: ["Reticulocyte"],
    oneLineSummary: "새로 만들어지는 ‘어린 적혈구’ 비율이에요.",
    whatIsIt: ["골수가 적혈구를 얼마나 열심히 만들고 있는지 보여줘요."],
    high: ["출혈/용혈 후 회복, 빈혈 치료(철분 등) 반응으로 증가할 수 있어요."],
    low: ["골수 기능 저하, 영양결핍 등이 있을 때 낮을 수 있어요."],
    tips: ["빈혈이 있을 때 ‘원인’과 ‘회복 중인지’를 가늠하는 데 도움이 돼요."],
    related: ["혈색소 (헤모글로빈)", "MCV", "총 빌리루빈"]
  },
  {
    test: "호중구 (Seg. neutrophil)",
    aliases: ["Seg. neutrophil", "Segmented Neutrophil", "Neutrophil"],
    oneLineSummary: "세균 감염 때 가장 먼저 움직이는 ‘주력 방어군’이에요.",
    whatIsIt: ["감별검사에서 ‘성숙한 호중구’ 비율(%)을 말해요."],
    high: ["세균 감염, 염증, 스트레스, 스테로이드 약 영향 등"],
    low: ["바이러스 감염, 약물/항암 치료, 골수 기능 문제 등"],
    tips: ["비율(%)은 WBC 총량에 따라 달라져요. ‘ANC(절대 호중구 수)’가 더 직접적일 때가 많아요."],
    related: ["백혈구 (WBC)", "ANC Absolute Neutrophil Count", "CRP (C-반응성 단백)"]
  },
  {
    test: "Band neutrophil",
    aliases: ["Band", "Band Neutrophils"],
    oneLineSummary: "아직 완전히 성숙하기 전(밴드형) 호중구예요.",
    whatIsIt: ["감염/염증이 심할 때 골수가 ‘급히’ 내보내는 호중구의 어린 형태일 수 있어요."],
    high: ["급성 감염/염증에서 ‘왼쪽 이동(left shift)’로 증가할 수 있어요."],
    low: ["0%도 흔한 정상 범위예요."],
    tips: ["Band가 늘면 보통 Seg 호중구/ANC/CRP와 같이 보고 맥락을 봐요."],
    related: ["호중구 (Seg. neutrophil)", "ANC Absolute Neutrophil Count", "CRP (C-반응성 단백)"]
  },
  {
    test: "호산구 (Eosinophil)",
    aliases: ["Eosinophil", "EOS"],
    oneLineSummary: "알레르기·천식·기생충 등과 연관될 수 있는 백혈구예요.",
    whatIsIt: ["감별검사에서 호산구의 비율(%)을 의미해요."],
    high: ["알레르기 질환(비염/천식 등), 기생충 감염, 일부 약물 반응 등"],
    low: ["대개 임상적 의미가 크지 않은 경우가 많아요(스트레스/스테로이드 영향 등)."],
    tips: ["증상(가려움, 천식, 비염)과 함께 보면 해석이 쉬워요."],
    related: ["CRP (C-반응성 단백)", "백혈구 (WBC)", "림프구 (Lymphocyte)"]
  },
  {
    test: "호염구 (Basophil)",
    aliases: ["Basophil", "BASO"],
    oneLineSummary: "알레르기 반응/염증 조절에 관여하는 ‘드문’ 백혈구예요.",
    whatIsIt: ["감별검사에서 호염구의 비율(%)을 의미해요."],
    high: ["알레르기/만성 염증, 드물게 특정 혈액질환에서 증가할 수 있어요."],
    low: ["낮다고 해서 보통 큰 문제가 되는 경우는 드물어요."],
    tips: ["절대 수치가 매우 적은 세포라 변동이 있어도 ‘전체 그림’이 더 중요해요."],
    related: ["호산구 (Eosinophil)", "CRP (C-반응성 단백)", "백혈구 (WBC)"]
  },
  {
    test: "림프구 (Lymphocyte)",
    aliases: ["Lymphocyte", "LYM"],
    oneLineSummary: "바이러스 감염·면역 기억을 담당하는 백혈구예요.",
    whatIsIt: ["B세포/T세포 등 면역의 핵심 세포들이 포함돼요."],
    high: ["바이러스 감염, 회복기, 일부 만성 감염 등", "지속적으로 높으면 추가 평가가 필요한 경우도 있어요."],
    low: ["스트레스/스테로이드, 영양 상태, 면역 저하 상태 등"],
    tips: ["비율(%)뿐 아니라 ‘ALC(절대 림프구 수)’도 같이 보면 좋아요."],
    related: ["ALC Absolute Lymphocyte Count", "백혈구 (WBC)", "비정형림프구 (Atypical Lymphocyte)"]
  },
  {
    test: "단핵구 (Monocyte)",
    aliases: ["Monocyte", "MONO"],
    oneLineSummary: "몸속 ‘청소·정리’ 역할을 하는 백혈구예요.",
    whatIsIt: ["감염 후 회복기나 만성 염증에서 증가할 수 있어요."],
    high: ["만성 감염/염증, 자가면역, 스트레스 등 다양한 상황"],
    low: ["대개 단독 의미는 크지 않고, 전체 혈구와 함께 봐요."],
    tips: ["‘왜 올랐는지’는 다른 백혈구 종류/증상과 같이 봐야 해요."],
    related: ["CRP (C-반응성 단백)", "백혈구 (WBC)", "림프구 (Lymphocyte)"]
  },
  {
    test: "비정형림프구 (Atypical Lymphocyte)",
    aliases: ["Atypical Lymphocyte"],
    oneLineSummary: "평소와 모양이 다른 림프구로, ‘반응성(reactive)’인 경우가 흔해요.",
    whatIsIt: ["바이러스 감염 등으로 림프구가 활성화되면 모양이 달라질 수 있어요."],
    high: ["바이러스 감염(대표적으로 EBV 등)이나 면역 반응이 강할 때"],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["이 항목은 ‘원인 확정’이 아니라 ‘힌트’예요. 증상/다른 수치와 함께 봐요."],
    related: ["림프구 (Lymphocyte)", "ALC Absolute Lymphocyte Count", "백혈구 (WBC)"]
  },
  {
    test: "ANC Absolute Neutrophil Count",
    aliases: ["ANC", "Absolute Neutrophil Count"],
    oneLineSummary: "감염 방어의 핵심인 호중구의 ‘절대 숫자’예요.",
    whatIsIt: ["WBC 총량과 호중구 비율을 합쳐 계산한 값이라, 실제 방어력 판단에 더 직접적이에요."],
    high: ["세균 감염/염증, 스트레스, 스테로이드 약 영향 등"],
    low: ["감염 위험이 올라갈 수 있어요(약물/항암/바이러스/골수 문제 등 원인 다양)."],
    tips: ["감기처럼 가벼운 상황에서도 흔들릴 수 있어요. 반복 측정과 증상이 중요해요."],
    related: ["백혈구 (WBC)", "호중구 (Seg. neutrophil)", "CRP (C-반응성 단백)"]
  },
  {
    test: "ALC Absolute Lymphocyte Count",
    aliases: ["ALC", "Absolute Lymphocyte Count"],
    oneLineSummary: "림프구의 ‘절대 숫자’로, 면역 상태를 더 직접적으로 봐요.",
    whatIsIt: ["림프구 비율(%)과 WBC를 함께 계산한 값이에요."],
    high: ["바이러스 감염, 회복기 등에서 증가할 수 있어요."],
    low: ["스트레스/스테로이드, 면역 저하 상태 등에서 낮을 수 있어요."],
    tips: ["비율(%)만 볼 때보다 ALC가 실제 변화에 더 민감할 때가 있어요."],
    related: ["림프구 (Lymphocyte)", "백혈구 (WBC)", "CRP (C-반응성 단백)"]
  },
  {
    test: "아구 (Blast)",
    aliases: ["Blast"],
    oneLineSummary: "아주 초기 단계의 혈액세포로, 보통은 ‘혈액’에 거의 없어요.",
    whatIsIt: ["블라스트는 원래 골수에서 성숙해요. 성인 말초혈액에서는 일반적으로 보이지 않아요."],
    high: ["검사에서 블라스트가 보이면 추가 평가(도말/정밀검사)가 필요한 경우가 많아요."],
    low: ["0%는 흔한 정상 소견이에요."],
    tips: ["이 항목은 ‘있다/없다’ 자체가 중요한 편이라, 검출 시 의료진 해석이 꼭 필요해요."],
    related: ["미성숙 세포 (Immature cell)", "전골수구 (Promyelocyte)", "비정상 림프구계 세포 (Abnormal Lymphoid cell)"]
  },
  {
    test: "전골수구 (Promyelocyte)",
    aliases: ["Promyelocyte"],
    oneLineSummary: "호중구 계열이 성숙해가는 ‘아주 이른 단계’ 세포예요.",
    whatIsIt: ["보통은 골수에서 보이고, 말초혈액에서는 0%가 일반적이에요."],
    high: ["심한 감염/염증으로 골수가 ‘서둘러’ 세포를 내보낼 때", "또는 혈액/골수 질환 평가가 필요할 때"],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["다른 미성숙 세포(골수구/후골수구)와 함께 묶어 해석하는 경우가 많아요."],
    related: ["골수구 (Myelocyte)", "후골수구 (Metamyelocyte)", "미성숙 세포 (Immature cell)"]
  },
  {
    test: "골수구 (Myelocyte)",
    aliases: ["Myelocyte"],
    oneLineSummary: "호중구가 성숙해가는 중간 단계(미성숙 과립구)예요.",
    whatIsIt: ["말초혈액에서는 보통 0%예요."],
    high: ["감염/염증 등으로 골수가 강하게 반응할 때", "또는 혈액/골수 질환 감별이 필요할 때"],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["‘Band/Seg 호중구’와 함께 보면 ‘왼쪽 이동’ 여부를 이해하기 좋아요."],
    related: ["Band neutrophil", "호중구 (Seg. neutrophil)", "ANC Absolute Neutrophil Count"]
  },
  {
    test: "후골수구 (Metamyelocyte)",
    aliases: ["Metamyelocyte"],
    oneLineSummary: "호중구가 성숙해가기 직전 단계의 미성숙 세포예요.",
    whatIsIt: ["말초혈액에서는 보통 0%예요."],
    high: ["감염/염증에서 골수 반응이 강할 때", "또는 추가 평가가 필요한 상황일 수 있어요."],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["미성숙 세포는 ‘정상에서도 거의 0’인 편이라, 검출 시 맥락(증상/다른 수치)이 중요해요."],
    related: ["미성숙 세포 (Immature cell)", "Band neutrophil", "CRP (C-반응성 단백)"]
  },
  {
    test: "미성숙 세포 (Immature cell)",
    aliases: ["Immature cell", "Immature Cells"],
    oneLineSummary: "아직 덜 성숙한 백혈구가 혈액에 보이는지 보는 항목이에요.",
    whatIsIt: ["주로 감염/염증 등으로 골수가 강하게 반응할 때 나타날 수 있어요."],
    high: ["급성 감염/염증, 심한 스트레스, 또는 골수 관련 문제 평가가 필요할 때"],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["‘있다/없다’가 중요한 편이라, 검출되면 보통 추가 해석(도말 등)이 따라요."],
    related: ["아구 (Blast)", "Band neutrophil", "백혈구 (WBC)"]
  },
  {
    test: "형질세포 (Plasma cell)",
    aliases: ["Plasma cell"],
    oneLineSummary: "항체를 만드는 세포로, 보통은 ‘골수/림프조직’에 있어요.",
    whatIsIt: ["B세포가 성숙해서 항체를 만드는 단계가 ‘형질세포’예요."],
    high: ["말초혈액에서 보이면 추가 확인이 필요한 경우가 있어요(흔하진 않아요)."],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["이 항목은 ‘드문 소견’이라, 결과가 나오면 의료진이 전체 CBC와 함께 판단해요."],
    related: ["총 단백", "글로불린", "비정상 림프구계 세포 (Abnormal Lymphoid cell)"]
  },
  {
    test: "핵적혈구 (Nucleated RBC)",
    aliases: ["Nucleated RBC", "NRBC"],
    oneLineSummary: "핵이 남아있는 ‘아주 어린 적혈구’가 혈액에 보이는지 보는 값이에요.",
    whatIsIt: ["성인에서는 말초혈액에서 거의 보이지 않는 게 일반적이에요."],
    high: ["몸이 산소 부족/심한 스트레스 상황이거나, 골수 반응이 강할 때 등에서 보일 수 있어요."],
    low: ["0이 흔한 정상 소견이에요."],
    tips: ["검출되면 ‘왜 나왔는지’ 맥락이 중요해서, 다른 혈구 수치/증상과 같이 봐요."],
    related: ["망상 적혈구", "혈색소 (헤모글로빈)", "아구 (Blast)"]
  },
  {
    test: "비정상 림프구계 세포 (Abnormal Lymphoid cell)",
    aliases: ["Abnormal Lymphoid cell"],
    oneLineSummary: "검사실에서 ‘정상과 다르게 보이는 림프구’가 있는지 표시하는 항목이에요.",
    whatIsIt: ["감별검사/도말에서 ‘모양이 비정상’으로 보이는 림프구가 있을 때 표시될 수 있어요."],
    high: ["감염으로 인한 반응성 변화일 수도 있고, 추가 평가가 필요한 경우도 있어요."],
    low: ["0%가 흔한 정상 소견이에요."],
    tips: ["이 항목은 ‘진단’이 아니라 ‘추가 확인 신호’에 가까워요."],
    related: ["비정형림프구 (Atypical Lymphocyte)", "ALC Absolute Lymphocyte Count", "아구 (Blast)"]
  },
  {
    test: "BUN (혈중 요소 질소)",
    aliases: ["BUN", "Blood Urea Nitrogen"],
    oneLineSummary: "단백질 대사 부산물(BUN)이 혈액에 얼마나 쌓였는지 보는 값이에요.",
    whatIsIt: ["BUN은 신장이 배설하는 노폐물 중 하나예요.", "수분 상태·단백 섭취·간 기능·신장 기능 영향을 같이 받아요."],
    high: ["탈수, 신장 기능 저하, 고단백 식사, 위장관 출혈 등"],
    low: ["저단백/영양 부족, 간에서 요소 생성이 줄어드는 상황 등"],
    tips: ["BUN은 ‘수분 상태’에 따라 잘 흔들려요. 크레아티닌/eGFR와 같이 보는 게 기본이에요."],
    related: ["Creatinine (크레아티닌)", "eGFR (추정 사구체여과율)", "비중"]
  },
  {
    test: "Creatinine (크레아티닌)",
    aliases: ["Creatinine", "Serum Creatinine"],
    oneLineSummary: "신장이 노폐물을 얼마나 잘 걸러내는지 보는 대표 지표예요.",
    whatIsIt: ["크레아티닌은 근육에서 자연스럽게 생기는 노폐물이에요.", "신장 기능이 떨어지면 혈액 크레아티닌이 올라갈 수 있어요."],
    high: ["신장 기능 저하, 탈수, 일부 약물/상황에서 상승할 수 있어요."],
    low: ["근육량이 적으면 낮게 나올 수 있어요(대개 큰 문제는 아님)."],
    tips: ["크레아티닌 하나보다 eGFR(추정치)와 함께 해석하는 경우가 많아요."],
    related: ["eGFR (추정 사구체여과율)", "Cystatin-C", "단백/크레아티닌 비(소변)"]
  },
  {
    test: "BUN & Creatinine ratio",
    aliases: ["BUN/Creatinine Ratio", "BUN Creatinine ratio"],
    oneLineSummary: "BUN과 크레아티닌을 ‘같이’ 봐서 수분/순환 상태 영향을 추정하는 보조 지표예요.",
    whatIsIt: ["같은 신장 기능이라도 ‘탈수/출혈/단백 섭취’ 등에 따라 BUN이 더 많이 오를 수 있어요."],
    high: ["탈수, 고단백 섭취, 위장관 출혈 등에서 상대적으로 높아질 수 있어요."],
    low: ["수분 과다, 단백 섭취가 적은 상태, 간 기능 영향 등에서 낮아질 수 있어요."],
    tips: ["이 비율만으로 결론을 내리기보다는, BUN/크레아티닌 각각과 임상 상황이 중요해요."],
    related: ["BUN (혈중 요소 질소)", "Creatinine (크레아티닌)", "비중"]
  },
  {
    test: "eGFR (추정 사구체여과율)",
    aliases: ["eGFR", "Estimated GFR"],
    oneLineSummary: "신장이 1분에 얼마나 잘 ‘걸러주는지(필터 속도)’를 추정한 값이에요.",
    whatIsIt: ["대개 혈액 크레아티닌, 나이, 성별 등의 정보를 바탕으로 계산해요."],
    high: ["대체로 ‘문제’보다 개인차/계산식 영향인 경우가 많아요."],
    low: ["신장 필터 기능이 떨어졌을 가능성을 의미해요(추세가 중요)."],
    tips: ["하루 컨디션(수분/근육량/약물)에 따라 달라질 수 있어요. ‘지속적으로 낮은지’가 핵심이에요."],
    related: ["Creatinine (크레아티닌)", "Cystatin-C", "단백/크레아티닌 비(소변)"]
  },
  {
    test: "Cystatin-C",
    aliases: ["Cystatin C"],
    oneLineSummary: "크레아티닌과 ‘다른 방식’으로 신장 기능을 가늠하는 지표예요.",
    whatIsIt: ["근육량 영향을 덜 받는 편이라, 어떤 사람에서는 더 정확한 추정에 도움이 돼요."],
    high: ["신장 여과 기능이 떨어졌을 때 상승할 수 있어요."],
    low: ["대개 임상적 의미는 크지 않은 경우가 많아요."],
    tips: ["크레아티닌 기반 eGFR과 ‘비슷한 추세인지’ 비교하면 도움이 돼요."],
    related: ["Cystatin-C, based GFR", "eGFR (추정 사구체여과율)", "Creatinine (크레아티닌)"]
  },
  {
    test: "Cystatin-C, based GFR",
    aliases: ["Cystatin-C based GFR", "eGFR Cystatin-C"],
    oneLineSummary: "시스타틴C로 계산한 eGFR(신장 필터 속도 추정치)예요.",
    whatIsIt: ["크레아티닌 대신 시스타틴C를 사용해 신장 기능을 추정해요."],
    high: ["대체로 큰 문제 의미보다는 개인차/계산식 영향인 경우가 많아요."],
    low: ["신장 여과 기능 저하 가능성을 시사해요(추세가 중요)."],
    tips: ["크레아티닌 기반 eGFR과 다를 수 있어요. 의료진은 두 값을 같이 보고 판단하기도 해요."],
    related: ["Cystatin-C", "eGFR (추정 사구체여과율)", "Protein, Random Urine"]
  },
  {
    test: "총 단백",
    aliases: ["Total Protein"],
    oneLineSummary: "혈액 속 단백질(알부민+글로불린) ‘총량’이에요.",
    whatIsIt: ["단백질은 몸의 구조·면역·수분 균형에 중요한 역할을 해요."],
    high: ["탈수(혈액 농축), 염증/면역 반응 증가 등"],
    low: ["영양 부족, 간에서 단백 생성 감소, 신장으로 단백 소실 등"],
    tips: ["총 단백이 변하면 ‘알부민/글로불린이 어느 쪽 때문에 변했는지’ 분해해서 보는 게 좋아요."],
    related: ["알부민", "글로불린", "알부민/글로불린 비"]
  },
  {
    test: "알부민",
    aliases: ["Albumin"],
    oneLineSummary: "혈액 단백질의 ‘주요 구성’으로, 간에서 만들고 수분 균형에도 관여해요.",
    whatIsIt: ["알부민은 혈관 안의 수분을 붙잡아주는 역할이 있어요."],
    high: ["주로 탈수(농축) 상황에서 올라가요."],
    low: ["간 기능 저하, 영양 부족, 염증, 신장으로 단백이 빠지는 경우 등"],
    tips: ["부종(붓기)이 있거나 소변 단백이 늘면 함께 해석하는 게 좋아요."],
    related: ["Protein, Random Urine", "단백/크레아티닌 비(소변)", "총 단백"]
  },
  {
    test: "글로불린",
    aliases: ["Globulin"],
    oneLineSummary: "면역 단백질(항체 등)이 포함된 단백질 ‘묶음’이에요.",
    whatIsIt: ["글로불린에는 면역 관련 단백들이 많이 포함돼요."],
    high: ["만성 염증/감염, 자가면역 반응, 일부 혈액질환 등"],
    low: ["면역 단백이 줄어드는 상태, 단백 소실 등(상황에 따라 다름)"],
    tips: ["총 단백이 정상이더라도 글로불린이 높고 알부민이 낮을 수 있어 ‘비율(A/G)’도 같이 봐요."],
    related: ["알부민/글로불린 비", "총 단백", "CRP (C-반응성 단백)"]
  },
  {
    test: "알부민/글로불린 비",
    aliases: ["A/G ratio", "Albumin/Globulin ratio"],
    oneLineSummary: "알부민과 글로불린의 ‘균형’을 보는 비율이에요.",
    whatIsIt: ["알부민(주로 간 생성) vs 글로불린(면역 단백 포함)의 균형을 봐요."],
    high: ["글로불린이 상대적으로 낮거나, 탈수로 알부민이 상대적으로 높을 때"],
    low: ["알부민이 낮거나(간/영양/소실), 글로불린이 높을 때(염증/면역 반응 등)"],
    tips: ["비율만 보지 말고 알부민/글로불린 ‘실제 수치’가 어느 쪽이 변했는지 확인이 중요해요."],
    related: ["알부민", "글로불린", "총 단백"]
  },
  {
    test: "총 빌리루빈",
    aliases: ["Total Bilirubin", "Bilirubin, Total"],
    oneLineSummary: "간이 ‘빌리루빈(노란 색소)’을 처리·배출하는 상태를 보여줘요.",
    whatIsIt: ["빌리루빈은 적혈구가 분해될 때 생기는 물질이에요.", "간/담도(담관) 문제나 적혈구 파괴 증가에서 올라갈 수 있어요."],
    high: ["간 질환, 담관 막힘(담도 문제), 적혈구가 빨리 파괴되는 상황 등"],
    low: ["대체로 큰 의미는 없는 경우가 많아요."],
    tips: ["황달(눈 흰자/피부 노래짐), 소변 색 변화가 있으면 빠르게 상담이 좋아요."],
    related: ["AST", "ALT", "ALP (Alkaline Phosphotase)"]
  },
  {
    test: "AST",
    aliases: ["GOT", "Aspartate Aminotransferase"],
    oneLineSummary: "간(그리고 근육 등) 손상 시 올라갈 수 있는 효소예요.",
    whatIsIt: ["AST는 간뿐 아니라 근육/심장 등에도 있어요."],
    high: ["간 손상, 근육 손상/격한 운동 등 다양한 이유로 상승할 수 있어요."],
    low: ["대개 임상적 의미는 크지 않아요."],
    tips: ["ALT와 같이 보면 ‘간 쪽 신호’인지 구분에 도움이 돼요."],
    related: ["ALT", "γ-GTP (감마 지티피)", "총 빌리루빈"]
  },
  {
    test: "ALT",
    aliases: ["GPT", "Alanine Aminotransferase"],
    oneLineSummary: "간세포가 손상될 때 혈액으로 나오는 ‘간 효소’예요.",
    whatIsIt: ["ALT는 주로 간에 있는 효소라 간 상태 평가에 자주 써요."],
    high: ["간염/지방간/약물/음주 등으로 간세포가 손상될 때 상승할 수 있어요."],
    low: ["대개 의미가 크지 않은 경우가 많아요."],
    tips: ["간수치는 ‘한 번’보다 ‘추세’와 다른 간 관련 검사(빌리루빈, PT 등)와 함께 봐요."],
    related: ["AST", "총 빌리루빈", "PT(INR)"]
  },
  {
    test: "ALP (Alkaline Phosphotase)",
    aliases: ["ALP", "Alkaline Phosphatase"],
    oneLineSummary: "간·담도(담관)·뼈에서 나오는 효소로, 원인 구분이 중요해요.",
    whatIsIt: ["ALP는 담관(담즙 통로)과 뼈에서 상대적으로 많이 나와요."],
    high: ["담도 문제(담즙 정체), 간 질환, 뼈 관련 문제 등"],
    low: ["대개 단독 의미는 크지 않아요(상황에 따라 다름)."],
    tips: ["ALP가 오를 때는 GGT와 같이 보면 ‘간/담도 쪽’인지 힌트가 될 수 있어요."],
    related: ["γ-GTP (감마 지티피)", "총 빌리루빈", "AST"]
  },
  {
    test: "γ-GTP (감마 지티피)",
    aliases: ["GGT", "Gamma GTP", "γ-GTP"],
    oneLineSummary: "간·담도(담관) 관련 변화에서 올라갈 수 있는 효소예요.",
    whatIsIt: ["GGT는 간/담도 질환 평가에 자주 포함돼요."],
    high: ["담도 문제, 간 질환, 음주, 일부 약물 영향 등"],
    low: ["대개 의미가 크지 않아요."],
    tips: ["ALP가 높을 때 GGT도 같이 높으면 ‘간/담도 쪽’ 가능성이 더 커질 수 있어요."],
    related: ["ALP (Alkaline Phosphotase)", "ALT", "총 빌리루빈"]
  },
  {
    test: "AFP (알파태아단백)",
    aliases: ["AFP", "Alpha-fetoprotein"],
    oneLineSummary: "간 질환/간암 평가나 추적에 쓰일 수 있는 ‘종양표지자’예요.",
    whatIsIt: ["AFP는 원래 태아에서 높은 단백질인데, 성인에서는 특정 상황에서 증가할 수 있어요."],
    high: ["간 질환/간암, 일부 생식세포 종양 등에서 상승할 수 있어요."],
    low: ["대개 문제를 의미하지 않아요."],
    tips: ["AFP는 단독으로 진단하지 않고, 영상검사·다른 간수치와 같이 해석해요."],
    related: ["ALT", "총 빌리루빈", "γ-GTP (감마 지티피)"]
  },
  {
    test: "나트륨 (Na)",
    aliases: ["Na", "Sodium"],
    oneLineSummary: "몸의 수분 균형과 혈압 조절에 중요한 전해질이에요.",
    whatIsIt: ["나트륨은 체액 균형을 잡는 핵심 전해질이에요."],
    high: ["탈수, 수분 섭취 부족, 일부 신장/호르몬 문제 등"],
    low: ["수분 과다, 특정 약물, 호르몬 문제 등(원인 다양)"],
    tips: ["증상(어지러움, 혼동 등)과 수분 상태가 중요해요."],
    related: ["비중", "총 이산화탄소", "칼륨 (K)"]
  },
  {
    test: "칼륨 (K)",
    aliases: ["K", "Potassium"],
    oneLineSummary: "근육·신경·심장 리듬에 매우 중요한 전해질이에요.",
    whatIsIt: ["칼륨은 심장 박동 리듬에도 영향을 줄 수 있어요."],
    high: ["신장 기능 저하, 일부 약물, 세포 손상 등"],
    low: ["이뇨제, 구토/설사, 섭취 부족 등"],
    tips: ["칼륨은 너무 높거나 낮으면 위험할 수 있어요. 이상 소견이 크면 의료진 상담이 중요해요."],
    related: ["Creatinine (크레아티닌)", "eGFR (추정 사구체여과율)", "총 이산화탄소"]
  },
  {
    test: "염소 (Cl)",
    aliases: ["Cl", "Chloride"],
    oneLineSummary: "나트륨·중탄산염과 함께 ‘수분/산-염기 균형’에 관여해요.",
    whatIsIt: ["염소(클로라이드)는 체액 균형과 산-염기 균형에 관련돼요."],
    high: ["탈수, 산-염기 변화(대사성 산증 등)와 동반될 수 있어요."],
    low: ["구토, 일부 대사성 알칼리증 상황 등에서 낮아질 수 있어요."],
    tips: ["보통 Na, 총 이산화탄소와 같이 ‘세트’로 봐요."],
    related: ["나트륨 (Na)", "총 이산화탄소", "칼륨 (K)"]
  },
  {
    test: "총 이산화탄소",
    aliases: ["Total CO2", "Total Carbon Dioxide", "TCO2"],
    oneLineSummary: "혈액의 산-염기 균형(중탄산염과 관련)을 보여주는 값이에요.",
    whatIsIt: ["대사성 산증/알칼리증 같은 상태의 단서가 될 수 있어요."],
    high: ["구토, 이뇨제 사용 등에서 ‘알칼리 쪽’으로 기울 때"],
    low: ["설사, 신장 문제, 케톤 증가 등에서 ‘산성 쪽’으로 기울 때"],
    tips: ["단독보다는 전해질 전체(Na/Cl/K)와 함께 봐요."],
    related: ["나트륨 (Na)", "염소 (Cl)", "칼륨 (K)"]
  },
  {
    test: "칼슘 (Ca)",
    aliases: ["Ca", "Calcium", "Total Calcium"],
    oneLineSummary: "뼈·신경·근육 기능에 중요한 ‘총 칼슘’이에요.",
    whatIsIt: ["혈액 속 칼슘의 ‘전체량’이에요(알부민 영향도 받을 수 있어요)."],
    high: ["부갑상선/비타민D/약물/탈수 등 다양한 원인이 있을 수 있어요."],
    low: ["비타민D 부족, 알부민 낮음, 신장 문제 등"],
    tips: ["알부민이 낮으면 총 칼슘도 낮게 보일 수 있어 ‘이온화 칼슘’을 같이 볼 때가 있어요."],
    related: ["이온화 칼슘", "알부민", "인 (P)"]
  },
  {
    test: "이온화 칼슘",
    aliases: ["Ionized Calcium", "Free Calcium"],
    oneLineSummary: "혈액에서 실제로 ‘활성 상태’인 칼슘을 더 직접적으로 봐요.",
    whatIsIt: ["총 칼슘보다 ‘몸이 실제로 쓰는 칼슘’에 더 가까운 값이에요."],
    high: ["칼슘 조절 문제(원인 다양)에서 상승할 수 있어요."],
    low: ["저칼슘혈증 원인(비타민D/부갑상선/신장 등)에서 낮을 수 있어요."],
    tips: ["총 칼슘과 결과가 다를 수 있어요(특히 알부민/중환자 상태)."],
    related: ["칼슘 (Ca)", "알부민", "인 (P)"]
  },
  {
    test: "인 (P)",
    aliases: ["Phosphorus", "Phosphate", "P"],
    oneLineSummary: "뼈와 에너지(ATP) 대사에 중요한 ‘인(인산염)’이에요.",
    whatIsIt: ["신장이 인을 조절하는 역할을 해요."],
    high: ["신장 기능 저하 등에서 상승할 수 있어요."],
    low: ["영양 부족, 특정 대사 상태 등에서 낮을 수 있어요."],
    tips: ["칼슘/비타민D/신장 기능과 같이 움직이는 경우가 많아요."],
    related: ["칼슘 (Ca)", "eGFR (추정 사구체여과율)", "Creatinine (크레아티닌)"]
  },
  {
    test: "요산",
    aliases: ["Uric Acid"],
    oneLineSummary: "요산은 퓨린 대사의 부산물로, 통풍과 연관될 수 있어요.",
    whatIsIt: ["요산이 높으면 관절에 결정이 쌓여 통풍을 일으킬 수 있어요."],
    high: ["통풍, 신장 기능 저하, 이뇨제, 퓨린 많은 음식/음주 등"],
    low: ["대개 임상적 의미가 크지 않은 경우가 많아요."],
    tips: ["증상(엄지발가락 통증/붓기 등)과 함께 보면 이해가 쉬워요."],
    related: ["Creatinine (크레아티닌)", "eGFR (추정 사구체여과율)", "CRP (C-반응성 단백)"]
  },
  {
    test: "공복 혈당",
    aliases: ["Fasting Glucose", "Glucose", "FBS"],
    oneLineSummary: "공복 상태에서의 혈당(에너지 연료)을 보는 검사예요.",
    whatIsIt: ["보통 8시간 이상 공복 후 측정해요(기관 안내에 따름)."],
    high: ["당뇨/당뇨 전단계, 스트레스, 일부 약물 영향 등"],
    low: ["식사 부족, 과도한 혈당강하 영향 등(상황에 따라 다름)"],
    tips: ["한 번보다 반복 측정 + HbA1c 같은 다른 지표와 함께 보는 경우가 많아요."],
    related: ["총 콜레스테롤", "요산", "eGFR (추정 사구체여과율)"]
  },
  {
    test: "CRP (C-반응성 단백)",
    aliases: ["CRP", "C-Reactive Protein"],
    oneLineSummary: "몸에 염증이 있으면 올라가는 ‘염증 신호등’ 같은 값이에요.",
    whatIsIt: ["감염/염증이 있을 때 간에서 만들어지는 단백질이에요."],
    high: ["감염(세균 포함), 염증성 질환, 조직 손상 등"],
    low: ["대체로 좋은 의미예요(염증 신호가 낮다는 뜻)."],
    tips: ["원인 ‘진단’보다는 ‘염증 정도/변화 추적’에 많이 써요."],
    related: ["백혈구 (WBC)", "호중구 (Seg. neutrophil)", "Protein, Random Urine"]
  },
  {
    test: "총 콜레스테롤",
    aliases: ["Total Cholesterol", "Cholesterol"],
    oneLineSummary: "혈액 속 콜레스테롤 총량으로, 심혈관 위험 평가에 쓰여요.",
    whatIsIt: ["총 콜레스테롤은 HDL/LDL 등을 포함한 ‘합계’ 개념이에요."],
    high: ["식습관, 유전, 갑상선 기능 저하 등 다양한 요인이 있어요."],
    low: ["영양 상태, 갑상선 기능 항진 등에서 낮을 수 있으나 단독 의미는 제한적이에요."],
    tips: ["총 콜레스테롤만으로 판단하기보다 LDL/HDL/중성지방과 함께 보는 게 좋아요."],
    related: ["공복 혈당", "요산", "CRP (C-반응성 단백)"]
  },
  {
    test: "PT(sec)",
    aliases: ["PT", "Prothrombin Time (sec)"],
    oneLineSummary: "피가 굳는 데 걸리는 시간(초)을 보는 검사예요.",
    whatIsIt: ["혈액 응고 경로(특히 PT 경로)를 평가해요."],
    high: ["피가 ‘천천히’ 굳는 상태(간 기능 저하, 비타민K 부족, 항응고제 등) 가능"],
    low: ["피가 ‘빠르게’ 굳는 쪽으로 보일 수 있으나, 단독 의미는 제한적일 때가 많아요."],
    tips: ["검사실마다 기준이 달라질 수 있어 INR과 같이 보는 경우가 많아요."],
    related: ["PT(INR)", "프로트롬빈 시간", "ALT"]
  },
  {
    test: "프로트롬빈 시간",
    aliases: ["Prothrombin Time", "PT activity"],
    oneLineSummary: "PT를 ‘퍼센트(%)’로 환산해 보여주는 방식(기관별 표기)일 수 있어요.",
    whatIsIt: ["같은 PT 결과를 다른 표기(활성도 %)로 보여주는 경우가 있어요."],
    high: ["표기 방식에 따라 해석이 달라질 수 있어 ‘PT(sec), INR’과 같이 확인이 좋아요."],
    low: ["표기 방식에 따라 의미가 달라질 수 있어요."],
    tips: ["대시보드에서는 ‘PT(sec)·INR과 같은 묶음’으로 안내하면 혼란이 줄어요."],
    related: ["PT(sec)", "PT(INR)", "총 빌리루빈"]
  },
  {
    test: "PT(INR)",
    aliases: ["INR", "Prothrombin Time INR"],
    oneLineSummary: "PT를 국제 기준으로 표준화한 값이에요(특히 와파린 모니터링에 사용).",
    whatIsIt: ["검사실이 달라도 비교하기 쉽게 만든 지표예요."],
    high: ["피가 잘 안 굳는 방향(출혈 위험↑) — 항응고제, 간 기능 문제, 비타민K 부족 등"],
    low: ["피가 잘 굳는 방향으로 보일 수 있으나 맥락이 중요해요."],
    tips: ["복용 약(특히 항응고제)이 있으면 반드시 의료진 목표 범위와 함께 봐야 해요."],
    related: ["PT(sec)", "ALT", "총 빌리루빈"]
  }
];

const EXACT_EXPLANATION_MAP = new Map<string, TestExplanation>();

for (const entry of TEST_EXPLANATIONS) {
  const keys = [entry.test, ...(entry.aliases ?? [])];
  for (const key of keys) {
    const normalized = normalizeTestKey(key);
    if (!normalized || EXACT_EXPLANATION_MAP.has(normalized)) {
      continue;
    }
    EXACT_EXPLANATION_MAP.set(normalized, entry);
  }
}

export function findTestExplanation(candidates: Array<string | null | undefined>) {
  const normalizedCandidates = candidates
    .map((value) => (value ? normalizeTestKey(value) : ""))
    .filter(Boolean);

  if (normalizedCandidates.length === 0) {
    return null;
  }

  for (const key of normalizedCandidates) {
    const exact = EXACT_EXPLANATION_MAP.get(key);
    if (exact) {
      return exact;
    }
  }

  let bestMatch: { score: number; entry: TestExplanation } | null = null;

  for (const entry of TEST_EXPLANATIONS) {
    const keys = [entry.test, ...(entry.aliases ?? [])].map((label) => normalizeTestKey(label));

    for (const candidateKey of normalizedCandidates) {
      for (const key of keys) {
        if (!key) {
          continue;
        }

        let score = 0;
        if (candidateKey === key) {
          score = 100 + key.length;
        } else if (
          Math.min(candidateKey.length, key.length) >= 3 &&
          (candidateKey.includes(key) || key.includes(candidateKey))
        ) {
          score = 10 + Math.min(candidateKey.length, key.length);
        }

        if (score === 0) {
          continue;
        }

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { score, entry };
        }
      }
    }
  }

  return bestMatch?.entry ?? null;
}
