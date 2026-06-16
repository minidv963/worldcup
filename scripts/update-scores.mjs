// scripts/update-scores.mjs
// 每日自动把世界杯真实比分写进 scores.json —— 已对接 football-data.org，开箱即用。
//
// 你只需要做一件事：
//   1. 去 https://www.football-data.org/client/register 免费注册，拿到 API Token；
//   2. 在 GitHub 仓库 Settings → Secrets and variables → Actions 里
//      新增一个 secret，名字叫  FOOTBALL_API_TOKEN ，值填你的 token。
// 之后 GitHub Actions 会按计划自动运行本脚本，无需改动任何代码。
//
// 原理：football-data.org 的比赛数据自带三字母队码(tla)，脚本据此把每场比分
//      对到我们网页用的场次编号(A1…L6)，再写入 scores.json。

import { writeFile } from 'node:fs/promises';

const TOKEN = process.env.FOOTBALL_API_TOKEN;
if (!TOKEN) { console.error('缺少 FOOTBALL_API_TOKEN（在仓库 Secrets 里配置）'); process.exit(1); }

// 场次编号 -> [主队码, 客队码]（顺序即 a:主队进球, b:客队进球）
const FIXTURES = {
  A1:['MEX','RSA'],A2:['KOR','CZE'],A3:['MEX','KOR'],A4:['CZE','RSA'],A5:['MEX','CZE'],A6:['RSA','KOR'],
  B1:['CAN','BIH'],B2:['QAT','SUI'],B3:['CAN','QAT'],B4:['SUI','BIH'],B5:['CAN','SUI'],B6:['BIH','QAT'],
  C1:['BRA','MAR'],C2:['HAI','SCO'],C3:['BRA','HAI'],C4:['SCO','MAR'],C5:['BRA','SCO'],C6:['MAR','HAI'],
  D1:['USA','PAR'],D2:['AUS','TUR'],D3:['USA','AUS'],D4:['TUR','PAR'],D5:['USA','TUR'],D6:['PAR','AUS'],
  E1:['GER','ECU'],E2:['CIV','CUW'],E3:['GER','CIV'],E4:['CUW','ECU'],E5:['GER','CUW'],E6:['ECU','CIV'],
  F1:['NED','JPN'],F2:['TUN','SWE'],F3:['NED','TUN'],F4:['SWE','JPN'],F5:['NED','SWE'],F6:['JPN','TUN'],
  G1:['BEL','IRN'],G2:['EGY','NZL'],G3:['BEL','EGY'],G4:['NZL','IRN'],G5:['BEL','NZL'],G6:['IRN','EGY'],
  H1:['ESP','KSA'],H2:['CPV','URU'],H3:['ESP','CPV'],H4:['URU','KSA'],H5:['ESP','URU'],H6:['KSA','CPV'],
  I1:['FRA','SEN'],I2:['NOR','IRQ'],I3:['FRA','IRQ'],I4:['SEN','NOR'],I5:['FRA','NOR'],I6:['SEN','IRQ'],
  J1:['ARG','ALG'],J2:['AUT','JOR'],J3:['ARG','AUT'],J4:['JOR','ALG'],J5:['ARG','JOR'],J6:['ALG','AUT'],
  K1:['POR','COD'],K2:['UZB','COL'],K3:['POR','UZB'],K4:['COL','COD'],K5:['POR','COL'],K6:['COD','UZB'],
  L1:['ENG','CRO'],L2:['GHA','PAN'],L3:['ENG','GHA'],L4:['PAN','CRO'],L5:['ENG','PAN'],L6:['CRO','GHA'],
};

// 后备：万一某队的 tla 与我们用的不一致，用球队全名兜底对照。
const NAME = {
  'Mexico':'MEX','South Africa':'RSA','South Korea':'KOR','Korea Republic':'KOR','Czechia':'CZE','Czech Republic':'CZE',
  'Canada':'CAN','Bosnia and Herzegovina':'BIH','Qatar':'QAT','Switzerland':'SUI',
  'Brazil':'BRA','Morocco':'MAR','Haiti':'HAI','Scotland':'SCO',
  'United States':'USA','Paraguay':'PAR','Australia':'AUS','Turkey':'TUR','Türkiye':'TUR',
  'Germany':'GER','Ecuador':'ECU','Ivory Coast':'CIV',"Cote d'Ivoire":'CIV','Curacao':'CUW','Curaçao':'CUW',
  'Netherlands':'NED','Japan':'JPN','Tunisia':'TUN','Sweden':'SWE',
  'Belgium':'BEL','Iran':'IRN','Egypt':'EGY','New Zealand':'NZL',
  'Spain':'ESP','Saudi Arabia':'KSA','Uruguay':'URU','Cape Verde':'CPV','Cabo Verde':'CPV',
  'France':'FRA','Senegal':'SEN','Norway':'NOR','Iraq':'IRQ',
  'Argentina':'ARG','Algeria':'ALG','Austria':'AUT','Jordan':'JOR',
  'Portugal':'POR','DR Congo':'COD','Congo DR':'COD','Uzbekistan':'UZB','Colombia':'COL',
  'England':'ENG','Croatia':'CRO','Ghana':'GHA','Panama':'PAN',
};

const code = (t)=> (t && (FIXTURES_HAS[t.tla] ? t.tla : (NAME[t.name] || NAME[t.shortName] || t.tla))) || null;
const FIXTURES_HAS = {};
for (const [,[h,a]] of Object.entries(FIXTURES)) { FIXTURES_HAS[h]=1; FIXTURES_HAS[a]=1; }

// [主码,客码] -> 场次编号
const KEY = {};
for (const [id,[h,a]] of Object.entries(FIXTURES)) KEY[h+'|'+a] = id;

async function main(){
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches?stage=GROUP_STAGE', {
    headers: { 'X-Auth-Token': TOKEN }
  });
  if(!res.ok){ console.error('API 错误', res.status, await res.text()); process.exit(1); }
  const data = await res.json();

  const scores = {};
  const unmatched = [];
  for (const m of (data.matches || [])){
    if (!['FINISHED','IN_PLAY','PAUSED','AWARDED'].includes(m.status)) continue;
    const home = code(m.homeTeam), away = code(m.awayTeam);
    const ga = m.score?.fullTime?.home, gb = m.score?.fullTime?.away;
    if (home==null || away==null || ga==null || gb==null){ unmatched.push(`${m.homeTeam?.name} vs ${m.awayTeam?.name}`); continue; }
    if (KEY[home+'|'+away]) scores[KEY[home+'|'+away]] = {a:ga, b:gb};
    else if (KEY[away+'|'+home]) scores[KEY[away+'|'+home]] = {a:gb, b:ga};
    else unmatched.push(`${home} vs ${away}`);
  }

  if (unmatched.length) console.warn('未能对上的比赛（可在 NAME 表里补球队名）：', unmatched);

  const out = {
    updated: new Date().toISOString().replace('T',' ').slice(0,16) + ' UTC',
    scores
  };
  await writeFile('scores.json', JSON.stringify(out, null, 2));
  console.log('已写入', Object.keys(scores).length, '场比分');
}

main().catch(e=>{ console.error(e); process.exit(1); });
