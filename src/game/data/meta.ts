import type { Stats } from '../types';

export interface MetaUpgradeDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  per: Partial<Stats> & { reroll?: number; revive?: number };
}

export const META_UPGRADES: MetaUpgradeDef[] = [
  { id: 'hp', name: '기초 체력', desc: '최대 체력 +10', maxLevel: 5, baseCost: 80, per: { maxHp: 10 } },
  { id: 'might', name: '선행 학습', desc: '공격력 +5%', maxLevel: 5, baseCost: 120, per: { might: 0.05 } },
  { id: 'speed', name: '등굣길 달리기', desc: '이동 속도 +4%', maxLevel: 3, baseCost: 100, per: { speed: 0.04 } },
  { id: 'xp', name: '오답 노트', desc: '경험치 획득 +5%', maxLevel: 5, baseCost: 90, per: { xpGain: 0.05 } },
  { id: 'area', name: '넓은 시야', desc: '공격 범위 +5%', maxLevel: 3, baseCost: 140, per: { area: 0.05 } },
  { id: 'luck', name: '행운의 부적', desc: '행운 +8%, 치명타 +2%', maxLevel: 3, baseCost: 130, per: { luck: 0.08, crit: 0.02 } },
  { id: 'armor', name: '두꺼운 교복', desc: '방어력 +1', maxLevel: 3, baseCost: 160, per: { armor: 1 } },
  { id: 'reroll', name: '준비물 챙기기', desc: '시작 리롤권 +1', maxLevel: 3, baseCost: 110, per: { reroll: 1 } },
  { id: 'revive', name: '보건실 이용권', desc: '사망 시 1회 부활 (체력 50%)', maxLevel: 2, baseCost: 600, per: { revive: 1 } },
];

export function metaCost(def: MetaUpgradeDef, level: number): number {
  return Math.round((def.baseCost * Math.pow(1 + level, 1.55)) / 10) * 10;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_run', name: '첫 등교', desc: '첫 번째 판을 마친다.', reward: 50 },
  { id: 'survive5', name: '첫 야자', desc: '한 판에서 5분 생존한다.', reward: 100 },
  { id: 'survive10', name: '막차 탑승', desc: '한 판에서 10분 생존한다.', reward: 250 },
  { id: 'kills1000', name: '청소 당번', desc: '누적 1,000마리를 처치한다.', reward: 150 },
  { id: 'kills10000', name: '학교 지킴이', desc: '누적 10,000마리를 처치한다.', reward: 600 },
  { id: 'run_kills', name: '한 반 전체', desc: '한 판에서 800마리를 처치한다.', reward: 200 },
  { id: 'level30', name: '수석 입학', desc: '한 판에서 레벨 30에 도달한다.', reward: 250 },
  { id: 'evolve1', name: '진화론', desc: '무기를 처음으로 진화시킨다.', reward: 150 },
  { id: 'evolve5', name: '진화의 정점', desc: '서로 다른 진화 무기 5종을 획득한다.', reward: 500 },
  { id: 'synergy1', name: '조별 과제', desc: '시너지를 처음으로 발동한다.', reward: 100 },
  { id: 'fullbuild', name: '꽉 찬 필통', desc: '한 판에서 무기 6개를 보유한다.', reward: 150 },
  { id: 'boss1', name: '첫 번째 하교', desc: '보스를 처음으로 처치한다.', reward: 150 },
  { id: 'clear_classroom', name: '2학년 3반 탈출', desc: 'STAGE 01 일반 교실을 클리어한다.', reward: 200 },
  { id: 'clear_hallway', name: '복도에서 뛰지 마시오', desc: 'STAGE 02 복도를 클리어한다.', reward: 300 },
  { id: 'clear_gym', name: '버저비터', desc: 'STAGE 03 체육관을 클리어한다.', reward: 400 },
  { id: 'clear_lab', name: '실험 성공', desc: 'STAGE 04 과학실을 클리어한다.', reward: 500 },
  { id: 'clear_rooftop', name: '라스트 벨', desc: 'STAGE 05 옥상을 클리어하고 방과 후를 끝낸다.', reward: 1000 },
  { id: 'all_chars', name: '전교생 집합', desc: '모든 캐릭터를 해금한다.', reward: 500 },
  { id: 'daily3', name: '성실한 학생', desc: '일일 미션을 3개 완료한다.', reward: 150 },
  { id: 'rich', name: '매점 VIP', desc: '학교 코인을 3,000개 보유한다.', reward: 200 },
];

export type MissionKind = 'kills' | 'survive' | 'level' | 'boss' | 'evolve' | 'coins' | 'char';

export interface MissionTemplate {
  kind: MissionKind;
  target: number;
  reward: number;
  text: (t: number, extra?: string) => string;
}

export const MISSION_POOL: MissionTemplate[] = [
  { kind: 'kills', target: 400, reward: 60, text: (t) => `적 ${t}마리 처치` },
  { kind: 'kills', target: 1200, reward: 120, text: (t) => `적 ${t}마리 처치` },
  { kind: 'survive', target: 300, reward: 80, text: (t) => `한 판에서 ${t / 60}분 생존` },
  { kind: 'survive', target: 480, reward: 130, text: (t) => `한 판에서 ${t / 60}분 생존` },
  { kind: 'level', target: 15, reward: 70, text: (t) => `한 판에서 레벨 ${t} 달성` },
  { kind: 'level', target: 25, reward: 130, text: (t) => `한 판에서 레벨 ${t} 달성` },
  { kind: 'boss', target: 1, reward: 120, text: () => `중간 보스 또는 보스 처치` },
  { kind: 'evolve', target: 1, reward: 120, text: () => `무기 1개 진화` },
  { kind: 'coins', target: 150, reward: 80, text: (t) => `코인 ${t}개 획득` },
  { kind: 'char', target: 1, reward: 70, text: (_t, extra) => `${extra}(으)로 3분 이상 생존` },
];
