type QuotePair = readonly [english: string, korean: string];

const investors: ReadonlyArray<{
  author: string;
  image: string;
  quotes: readonly QuotePair[];
}> = [
  {
    author: "워런 버핏",
    image: "/images/buffett-principles-advisor.webp",
    quotes: [
      [
        "Price is what you pay. Value is what you get.",
        "가격은 당신이 지불하는 것이고, 가치는 당신이 얻는 것이다.",
      ],
      [
        "Be fearful when others are greedy, and greedy when others are fearful.",
        "다른 사람들이 탐욕스러울 때 두려워하고, 다른 사람들이 두려워할 때 탐욕스러워져라.",
      ],
      [
        "Time is the friend of the wonderful company, the enemy of the mediocre.",
        "시간은 훌륭한 기업의 친구이고, 평범한 기업의 적이다.",
      ],
      [
        "Our favorite holding period is forever.",
        "우리가 가장 좋아하는 보유 기간은 영원이다.",
      ],
      [
        "Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.",
        "투자의 첫 번째 원칙은 돈을 잃지 않는 것이다. 두 번째 원칙은 첫 번째 원칙을 잊지 않는 것이다.",
      ],
      [
        "If you aren't willing to own a stock for ten years, don't even think about owning it for ten minutes.",
        "10년 동안 보유할 생각이 없다면 10분 동안도 보유할 생각을 하지 마라.",
      ],
      [
        "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
        "훌륭한 기업을 적정 가격에 사는 것이 적정한 기업을 훌륭한 가격에 사는 것보다 훨씬 낫다.",
      ],
      ["When the opportunity comes, act.", "기회가 왔을 때 행동하라."],
      [
        "The stock market is designed to transfer money from the active to the patient.",
        "주식시장은 적극적으로 움직이는 사람에게서 인내심 있는 사람에게 돈을 옮기는 장치다.",
      ],
      [
        "Someone's sitting in the shade today because someone planted a tree a long time ago.",
        "오늘 누군가 그늘에 앉아 있는 것은 오래전에 누군가 나무를 심었기 때문이다.",
      ],
    ],
  },
  {
    author: "찰리 멍거",
    image: "/images/charlie-munger-loading-character.webp",
    quotes: [
      [
        "The big money is not in the buying and selling, but in the waiting.",
        "큰돈은 사고파는 데서 생기는 것이 아니라 기다리는 데서 생긴다.",
      ],
      [
        "A great business at a fair price is superior to a fair business at a great price.",
        "훌륭한 기업을 적정 가격에 사는 것이 적정한 기업을 아주 싼 가격에 사는 것보다 낫다.",
      ],
      [
        "The surest way to get what you want is to deserve what you want.",
        "인생에서 원하는 것을 얻는 가장 확실한 방법은 그것을 받을 자격이 있는 사람이 되는 것이다.",
      ],
      [
        "Investing is not easy. Anyone who finds it easy is stupid.",
        "투자는 쉬운 일이 아니다. 쉽다고 생각하는 사람은 어리석다.",
      ],
      [
        "Trying to be consistently not stupid, instead of trying to be very intelligent, gives a remarkable long-term advantage.",
        "매우 영리해지려고 노력하기보다 꾸준히 어리석지 않으려고 노력하는 것이 놀라운 장기적 이점을 준다.",
      ],
      [
        "Opportunities come infrequently. When it rains gold, put out the bucket, not the thimble.",
        "기회는 자주 오지 않는다. 황금비가 내릴 때는 골무가 아니라 양동이를 내밀어라.",
      ],
      [
        "Go to bed smarter than when you woke up.",
        "매일 조금씩 더 현명해지려고 노력하라.",
      ],
      [
        "All I want to know is where I'm going to die, so I'll never go there.",
        "내가 알고 싶은 것은 내가 어디서 죽을 것인가이다. 그러면 절대로 그곳에 가지 않을 것이다.",
      ],
      [
        "Envy is a really stupid sin because it's the only one you couldn't have any fun at.",
        "질투는 정말 어리석은 죄다. 재미조차 없다.",
      ],
      [
        "The first rule of compounding is to never interrupt it unnecessarily.",
        "복리의 첫 번째 규칙은 불필요하게 복리를 방해하지 않는 것이다.",
      ],
    ],
  },
  {
    author: "벤저민 그레이엄",
    image: "/images/benjamin-graham-loading-character.webp",
    quotes: [
      [
        "Confronted with a challenge to distill the secret of sound investment into three words, we venture the motto: Margin of Safety.",
        "건전한 투자의 비밀을 세 단어로 요약한다면 안전마진이다.",
      ],
      [
        "In the short run, the market is a voting machine, but in the long run it is a weighing machine.",
        "단기적으로 시장은 투표기지만 장기적으로는 저울이다.",
      ],
      [
        "The investor's chief problem—and even his worst enemy—is likely to be himself.",
        "투자에서 가장 위험한 적은 자기 자신일 가능성이 높다.",
      ],
      [
        "Investment is most intelligent when it is most businesslike.",
        "성공적인 투자자는 사업적 원칙에 따라 투자한다.",
      ],
      [
        "The intelligent investor is a realist who sells to optimists and buys from pessimists.",
        "현명한 투자자는 낙관론자에게 팔고 비관론자에게 산다.",
      ],
      [
        "Price fluctuations have only one significant meaning for the true investor: an opportunity to buy wisely and sell wisely.",
        "가격 변동은 진정한 투자자에게 현명하게 사고팔 기회를 제공한다.",
      ],
      [
        "Mr. Market is there to serve you, not to guide you.",
        "미스터 마켓은 당신을 돕기 위해 존재하는 것이지 당신을 지배하기 위해 존재하는 것이 아니다.",
      ],
      [
        "The investor's chief problem—and even his worst enemy—is likely to be himself.",
        "투자에서 가장 위험한 적은 자기 자신일 가능성이 높다.",
      ],
      [
        "The essence of investment management is the management of risks, not the management of returns.",
        "투자 운용에서 가장 중요한 것은 큰 손실을 피하는 것이다.",
      ],
      [
        "An investment operation is one which, upon thorough analysis, promises safety of principal and an adequate return.",
        "투자는 철저한 분석을 통해 원금의 안전과 적절한 수익을 약속하는 행위다.",
      ],
    ],
  },
  {
    author: "피터 린치",
    image: "/images/peter-lynch-loading-character.webp",
    quotes: [
      [
        "Know what you own, and know why you own it.",
        "무엇을 보유하고 있는지, 그리고 왜 보유하고 있는지를 알아라.",
      ],
      [
        "Behind every stock is a company. Find out what it's doing.",
        "주식 뒤에는 기업이 있다는 것을 기억하라.",
      ],
      [
        "The key organ in your body in the stock market is your stomach, not your brain.",
        "주식시장에서 가장 중요한 기관은 위장이며 두뇌가 아니다.",
      ],
      [
        "People spend months researching a house, but only minutes researching a stock.",
        "사람들은 부동산을 살 때 몇 달을 조사하면서 주식을 살 때는 몇 분밖에 쓰지 않는다.",
      ],
      [
        "The key organ in your body in the stock market is your stomach, not your brain.",
        "주식시장에서 가장 중요한 기관은 위장이며 두뇌가 아니다.",
      ],
      [
        "If you've found the right company, time is on your side.",
        "좋은 기업을 발견했다면 시간이 당신 편이다.",
      ],
      [
        "Just because a stock has gone down doesn't mean it can't go lower.",
        "주가가 떨어졌다는 이유만으로 더 떨어질 수 없다고 생각하지 마라.",
      ],
      [
        "The perfect company has a simple, perfectly understandable business.",
        "완벽한 기업을 찾는다면 단순하고 이해하기 쉬운 사업부터 보라.",
      ],
      [
        "Behind every stock is a company. Find out what it's doing.",
        "모든 주식 뒤에는 기업이 있다. 그 기업이 무엇을 하고 있는지 알아내라.",
      ],
      [
        "The real key to making money in stocks is not to get scared out of them.",
        "주식시장에서 돈을 벌기 위한 핵심은 겁먹고 빠져나가지 않는 것이다.",
      ],
    ],
  },
  {
    author: "필립 피셔",
    image: "/images/philip-fisher-loading-character.webp",
    quotes: [
      [
        "The best time to buy a stock is when you have found an outstanding company.",
        "주식을 사기에 가장 좋은 시기는 훌륭한 기업을 발견했을 때다.",
      ],
      [
        "Finding truly outstanding companies and staying with them has produced far greater returns.",
        "정말 뛰어난 기업을 찾아 함께하는 것이 훨씬 더 높은 수익을 가져왔다.",
      ],
      [
        "Buying a stock means buying a part of a business.",
        "주식을 사는 것은 그 기업의 일부를 사는 것이다.",
      ],
      [
        "Look at how strongly management is focused on long-term growth.",
        "기업의 경영진이 장기적인 성장에 얼마나 집중하는지 살펴라.",
      ],
      [
        "Use every possible source to learn the facts about a company.",
        "기업에 대한 사실을 알아내기 위해 가능한 모든 정보원을 활용하라.",
      ],
      [
        "Future earning power matters more than current earnings.",
        "현재 이익보다 미래의 이익 창출 능력이 더 중요하다.",
      ],
      [
        "Don't sell an outstanding company merely because it appears overvalued.",
        "뛰어난 기업의 주식을 단지 고평가된 것처럼 보인다는 이유로 팔지 마라.",
      ],
      [
        "If the job has been correctly done when a common stock is purchased, the time to sell it is almost never.",
        "좋은 주식을 샀다면 매도 시점을 지나치게 고민할 필요가 없다.",
      ],
      [
        "Examine whether a company's competitive advantage can endure.",
        "기업의 경쟁우위가 유지될 수 있는지를 살펴라.",
      ],
      [
        "The greatest investment rewards come from owning outstanding companies for many years.",
        "훌륭한 기업을 오래 보유하면 빠른 매매보다 더 큰 돈을 벌 기회가 있다.",
      ],
    ],
  },
  {
    author: "존 템플턴",
    image: "/images/john-templeton-loading-character.webp",
    quotes: [
      [
        "The time of maximum pessimism is the best time to buy, and the time of maximum optimism is the best time to sell.",
        "최대 비관론의 시점이 최고의 매수 시점이고, 최대 낙관론의 시점이 최고의 매도 시점이다.",
      ],
      [
        "If you buy the same securities as other people, you will have the same results as other people.",
        "남들과 같은 종목을 산다면 남들과 같은 결과를 얻게 된다.",
      ],
      [
        "To beat the market, you must do something different from the crowd.",
        "시장을 이기려면 대중과 다른 행동을 해야 한다.",
      ],
      [
        "The best bargains are found in the most pessimistic markets.",
        "가장 좋은 투자 기회는 가장 비관적인 곳에서 발견된다.",
      ],
      [
        "Search worldwide for the best investment opportunities.",
        "전 세계에서 가장 좋은 투자 기회를 찾아라.",
      ],
      [
        "The four most dangerous words in investing are: This time it's different.",
        "투자에서 가장 위험한 네 단어는 ‘이번에는 다르다’이다.",
      ],
      [
        "Bull markets are born on pessimism, grow on skepticism, mature on optimism, and die on euphoria.",
        "강세장은 비관 속에서 태어나 회의 속에서 성장하며, 낙관 속에서 성숙해 행복 속에서 죽는다.",
      ],
      [
        "There is no real success without mistakes.",
        "실수하지 않은 투자자는 존재하지 않는다.",
      ],
      [
        "To succeed, you must learn from your mistakes.",
        "성공하려면 실수에서 배워야 한다.",
      ],
      [
        "The secret of investment success is to find value before others recognize it.",
        "투자 성공의 비결은 가치 있는 것을 다른 사람들이 알아보기 전에 찾는 것이다.",
      ],
    ],
  },
  {
    author: "존 보글",
    image: "/images/john-bogle-loading-character.webp",
    quotes: [
      [
        "Don't look for the needle in the haystack. Just buy the haystack!",
        "건초더미에서 바늘을 찾지 마라. 그냥 건초더미 전체를 사라.",
      ],
      [
        "In investing, you get what you don't pay for.",
        "투자에서는 지불하지 않은 만큼 얻는다.",
      ],
      [
        "Time is your friend; impulse is your enemy.",
        "시간은 당신의 친구이고 충동은 당신의 적이다.",
      ],
      ["Stay the course.", "시장에서 빠져나가지 말고 계속 투자하라."],
      ["Don't chase performance.", "수익률을 쫓지 마라."],
      ["Minimize costs.", "비용을 최소화하라."],
      ["Don't try to predict the market.", "시장을 예측하려 하지 마라."],
      ["Keep it simple.", "단순함을 유지하라."],
      [
        "Successful long-term investing requires patience and discipline.",
        "장기 투자 성공에는 인내와 규율이 필요하다.",
      ],
      [
        "You cannot capture all market returns, but lower costs let you keep more of them.",
        "시장의 모든 수익을 가져갈 수는 없지만 비용을 줄이면 더 많은 수익을 남길 수 있다.",
      ],
    ],
  },
  {
    author: "하워드 막스",
    image: "/images/howard-marks-loading-character.webp",
    quotes: [
      [
        "If you want superior results, your thinking has to be superior.",
        "평균 이상의 성과를 원한다면 당신의 사고도 평균 이상이어야 한다.",
      ],
      ["You must be more right than others.", "다른 사람보다 더 옳아야 한다."],
      [
        "Second-level thinking means thinking differently and better.",
        "2차적 사고는 남들과 다르게 생각하면서 동시에 더 정확하게 생각하는 것이다.",
      ],
      [
        "A good company isn't necessarily a good investment.",
        "좋은 기업이라는 것만으로 좋은 투자가 되는 것은 아니다.",
      ],
      [
        "Price is enormously important to investment success.",
        "투자 성공에는 가격이 매우 중요하다.",
      ],
      [
        "The key isn't knowing what will happen, but being prepared for what might happen.",
        "투자에서 중요한 것은 미래를 아는 것이 아니라 가능한 결과에 대비하는 것이다.",
      ],
      [
        "Riskier investments don't necessarily provide higher returns.",
        "리스크가 크다고 높은 수익이 보장되는 것은 아니다.",
      ],
      ["Most things prove to be cyclical.", "대부분의 것들은 사이클을 따른다."],
      [
        "Market extremes are created by people's emotions.",
        "시장의 극단적인 상황은 사람들의 감정에서 만들어진다.",
      ],
      [
        "If everyone knows the same thing, it isn't an investment advantage.",
        "모두가 같은 것을 알고 있다면 그것은 투자 우위가 아니다.",
      ],
    ],
  },
  {
    author: "레이 달리오",
    image: "/images/ray-dalio-loading-character.webp",
    quotes: [
      [
        "Having a handful of good, uncorrelated return streams is the holy grail of investing.",
        "서로 상관관계가 낮은 좋은 수익원을 여러 개 갖는 것이 투자의 성배다.",
      ],
      [
        "Knowing how to deal with what you don't know is more important than anything you know.",
        "모르는 것을 어떻게 다룰 것인지 아는 것이 아는 것보다 중요하다.",
      ],
      ["Pain plus reflection equals progress.", "고통 + 성찰 = 발전."],
      [
        "Understand how reality works and act in harmony with it.",
        "현실이 어떻게 작동하는지 이해하고 그것에 맞춰 행동하라.",
      ],
      [
        "The economy works like a simple machine.",
        "경제는 단순한 기계처럼 작동한다.",
      ],
      [
        "Understanding the debt cycle explains much of what happens in an economy.",
        "부채 사이클을 이해하면 경제에서 일어나는 많은 일을 이해할 수 있다.",
      ],
      [
        "Diversification can greatly reduce risk.",
        "분산투자는 위험을 크게 줄일 수 있다.",
      ],
      ["Cash can be a risky asset too.", "현금도 위험한 자산일 수 있다."],
      [
        "Always consider the possibility that you are wrong.",
        "자신이 틀릴 가능성을 항상 생각하라.",
      ],
      [
        "Successful investing is not about predicting one future, but preparing for many possible futures.",
        "성공적인 투자는 미래를 확실하게 예측하는 것이 아니라 다양한 미래에 대비하는 것이다.",
      ],
    ],
  },
  {
    author: "조엘 그린블라트",
    image: "/images/joel-greenblatt-loading-character.webp",
    quotes: [
      [
        "Buy good businesses at bargain prices.",
        "좋은 기업을 할인된 가격에 사라.",
      ],
      [
        "Stocks are not pieces of paper; they are ownership interests in businesses.",
        "주식은 종이 조각이 아니라 기업의 소유권이다.",
      ],
      [
        "There is a difference between price and value.",
        "가격과 가치 사이에는 차이가 있다.",
      ],
      [
        "Don't be swayed by Mr. Market's emotions.",
        "Mr. Market의 감정에 휘둘리지 마라.",
      ],
      [
        "The market can be inefficient in the short run.",
        "시장은 단기적으로 비효율적일 수 있다.",
      ],
      [
        "Good businesses earn high returns on the capital they invest.",
        "좋은 기업은 투자한 자본으로 높은 수익을 만들어낸다.",
      ],
      [
        "Buying good businesses cheaply is the heart of the Magic Formula.",
        "좋은 기업을 싸게 사는 것이 Magic Formula의 핵심이다.",
      ],
      [
        "Don't abandon a good strategy just because it doesn't work for a while.",
        "단기간에 효과가 없다고 좋은 전략을 포기하지 마라.",
      ],
      [
        "For a strategy to work over time, it must be difficult for others to follow.",
        "투자 전략이 장기간 효과를 내려면 다른 사람들이 계속 따르기 어려워야 한다.",
      ],
      [
        "The key is to determine a business's value and pay much less.",
        "투자에서 중요한 것은 기업의 가치를 알아내고 그보다 훨씬 낮은 가격을 지불하는 것이다.",
      ],
    ],
  },
];

export const INVESTMENT_WISDOM = investors.flatMap((investor) =>
  investor.quotes.map(([english, korean]) => ({
    english,
    korean,
    author: investor.author,
    image: investor.image,
  })),
);
