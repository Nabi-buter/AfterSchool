import type { BossDef, EnemyDef } from '../types';

export const ENEMIES: EnemyDef[] = [
  { id: 'slime', name: '교과서 슬라임', desc: '펼쳐진 교과서가 뭉쳐 생긴 슬라임. 쓰러지면 두 권으로 갈라진다.', behavior: 'splitter', hp: 10, speed: 52, dmg: 6, radius: 12, xp: 1, sprite: 'slime', splitInto: 'slime_mini', splitCount: 2 },
  { id: 'slime_mini', name: '쪽지 슬라임', desc: '교과서 슬라임에서 떨어져 나온 작은 쪽지.', behavior: 'chase', hp: 3, speed: 78, dmg: 3, radius: 7, xp: 1, sprite: 'slime_mini' },
  { id: 'ghost', name: '시험지 유령', desc: '빨간 펜 자국이 가득한 시험지. 흔들리며 다가온다.', behavior: 'wobble', hp: 8, speed: 78, dmg: 5, radius: 11, xp: 1, sprite: 'ghost' },
  { id: 'worm', name: '분필 벌레', desc: '부러진 분필 조각이 꿈틀거린다. 무리 지어 몰려온다.', behavior: 'chase', hp: 5, speed: 92, dmg: 4, radius: 8, xp: 1, sprite: 'worm' },
  { id: 'eraser', name: '지우개 골렘', desc: '수백 개의 지우개가 뭉친 거인. 느리지만 단단하다.', behavior: 'tank', hp: 95, speed: 36, dmg: 12, radius: 20, xp: 6, sprite: 'eraser', knockResist: 0.85, armor: 2 },
  { id: 'locker', name: '사물함 괴물', desc: '잠긴 사물함이 입을 벌린다. 잠시 멈췄다가 돌진한다.', behavior: 'dash', hp: 44, speed: 48, dmg: 14, radius: 17, xp: 3, sprite: 'locker', knockResist: 0.5 },
  { id: 'knight', name: '샤프 펜슬 기사', desc: '지우개 방패를 든 샤프 기사. 정면 공격에 강하고, 찌르기를 한다.', behavior: 'shield', hp: 50, speed: 58, dmg: 11, radius: 14, xp: 3, sprite: 'knight', armor: 4, knockResist: 0.6 },
  { id: 'zombie', name: '체육복 좀비', desc: '빨지 않은 체육복이 스스로 걸어 다닌다.', behavior: 'chase', hp: 30, speed: 60, dmg: 9, radius: 13, xp: 2, sprite: 'zombie' },
  { id: 'mimic', name: '급식실 미믹', desc: '맛있어 보이는 식판으로 위장한다. 가까이 가면 문다.', behavior: 'mimic', hp: 60, speed: 125, dmg: 15, radius: 14, xp: 8, sprite: 'mimic' },
  { id: 'plane', name: '종이비행기 떼', desc: '접어 날린 가정통신문. 대형을 이루어 일직선으로 날아간다.', behavior: 'swarm', hp: 8, speed: 190, dmg: 6, radius: 9, xp: 1, sprite: 'plane' },
  { id: 'wraith', name: '칠판 망령', desc: '지워지지 않은 판서의 원념. 거리를 두고 분필 가루를 쏜다.', behavior: 'ranged', hp: 26, speed: 56, dmg: 8, radius: 13, xp: 3, sprite: 'wraith' },
  { id: 'bomb', name: '알람 시계 폭탄', desc: '째깍거리며 달려와 플레이어 근처에서 터진다.', behavior: 'bomber', hp: 18, speed: 105, dmg: 22, radius: 11, xp: 2, sprite: 'bomb' },
  { id: 'ball', name: '농구공 추적자', desc: '혼자 튀는 농구공. 직선으로 튕기며 빠르게 움직인다.', behavior: 'bouncer', hp: 22, speed: 175, dmg: 9, radius: 11, xp: 2, sprite: 'ball', knockResist: 0.3 },
  { id: 'specimen', name: '과학실 실험체', desc: '플라스크에서 탈출한 점액체. 지나간 자리에 산성 웅덩이를 남긴다.', behavior: 'hazard', hp: 42, speed: 54, dmg: 10, radius: 14, xp: 3, sprite: 'specimen' },
  { id: 'monitor', name: '복도 감시자', desc: '복도를 지키는 완장의 망령. 호루라기로 분필 벌레를 부른다.', behavior: 'summoner', hp: 120, speed: 40, dmg: 12, radius: 18, xp: 10, sprite: 'monitor', summon: 'worm', knockResist: 0.7 },
  { id: 'nightwraith', name: '야간 자율학습 망령', desc: '밤 10시가 지나도 집에 가지 못한 그림자. 순간 이동한다.', behavior: 'blink', hp: 58, speed: 72, dmg: 16, radius: 14, xp: 5, sprite: 'nightwraith', knockResist: 0.4 },
  { id: 'dodgeball', name: '피구 망령', desc: '피구 시합에서 끝까지 살아남았던 누군가. 공을 던진다.', behavior: 'ranged', hp: 34, speed: 70, dmg: 10, radius: 13, xp: 3, sprite: 'dodgeball' },
];

export const ENEMY_MAP: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

export const BOSSES: BossDef[] = [
  { id: 'proctor', name: '교무실의 감독관', title: 'STAGE 01 BOSS', desc: '마지막 시험을 감독하는 존재. 시험지를 원형으로 흩뿌리고, 부정행위자를 쫓는다.', hp: 2600, speed: 58, dmg: 16, radius: 30, sprite: 'proctor', pattern: 'proctor' },
  { id: 'discipline', name: '복도의 생활지도부장', title: 'STAGE 02 BOSS', desc: '복도에서 뛰는 학생을 절대 용서하지 않는다. 경고선을 따라 돌진한다.', hp: 4400, speed: 64, dmg: 20, radius: 30, sprite: 'discipline', pattern: 'discipline' },
  { id: 'golem', name: '체육관의 농구 골렘', title: 'STAGE 03 BOSS', desc: '체육 창고의 공들이 뭉친 거인. 바닥을 내려찍고 공을 난사한다.', hp: 7200, speed: 52, dmg: 24, radius: 38, sprite: 'golem', pattern: 'golem' },
  { id: 'failed', name: '과학실의 실패한 실험체', title: 'STAGE 04 BOSS', desc: '누구도 기록하지 않은 실험의 결과. 산성을 뿌리고 스스로 분열한다.', hp: 10000, speed: 56, dmg: 24, radius: 34, sprite: 'failed', pattern: 'specimen' },
  { id: 'lastbell', name: '옥상의 마지막 종', title: 'FINAL BOSS', desc: '하교 종을 울리던 낡은 종. 그 소리가 멈추지 않는 한 방과 후는 끝나지 않는다.', hp: 17000, speed: 46, dmg: 28, radius: 40, sprite: 'lastbell', pattern: 'lastbell' },
];

export const BOSS_MAP: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
