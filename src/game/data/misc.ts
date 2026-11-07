import type { ScheduleEventDef, SynergyDef } from '../types';

export const SCHEDULE_EVENTS: ScheduleEventDef[] = [
  { id: 'break', name: '쉬는 시간', period: 'BREAK', desc: '이동 속도 +30%, 쿨타임 -10%', duration: 25 },
  { id: 'lunch', name: '점심시간', period: 'LUNCH', desc: '반찬 드롭 4배, 체력 서서히 회복', duration: 30 },
  { id: 'night', name: '야간 자율학습', period: 'NIGHT STUDY', desc: '경험치 +60%, 시야가 어두워진다', duration: 30 },
  { id: 'exam', name: '시험 시간', period: 'EXAM', desc: '적 공격력 +35%, 적 증가 · 경험치와 코인 +50%', duration: 30 },
  { id: 'cleaning', name: '청소 시간', period: 'CLEANING', desc: '대걸레가 지나간 자리의 적이 사라진다', duration: 14 },
];

export const EVENT_MAP = Object.fromEntries(SCHEDULE_EVENTS.map((e) => [e.id, e]));

export const SYNERGIES: SynergyDef[] = [
  { id: 'draft', name: '제도 세트', desc: '컴퍼스 +1개, 샤프심 관통 +2', needs: ['compass', 'pencil'] },
  { id: 'cheer', name: '응원단', desc: '음파에 맞은 농구공이 가속 · 농구공 튕김 +3', needs: ['basketball', 'speaker'] },
  { id: 'smudge', name: '번진 답안지', desc: '시험지가 적중한 자리에 작은 잉크 자국', needs: ['paper', 'ink'] },
  { id: 'wakeup', name: '기상 소집', desc: '알람 폭발 직전에 주변 적을 끌어당긴다', needs: ['alarm', 'magnet'] },
  { id: 'review', name: '예습 복습', desc: '교과서 낙하 지점에서 추적 탄환 2발 발사', needs: ['textbook', 'edict'] },
  { id: 'lecture', name: '판서 수업', desc: '분필이 적중하면 확률적으로 분필 가루 폭발', needs: ['chalk', 'textbook'] },
  { id: 'meal', name: '든든한 한 끼', desc: '급식 카트가 지나간 길에 반찬이 떨어진다', needs: ['cart', 'lunch'] },
  { id: 'flow', name: '몰입', desc: '치명타 피해 +50%', needs: ['focus', 'luck'] },
  { id: 'insider', name: '인싸', desc: '획득 범위 +30%, 이동 속도 +5%', needs: ['agility', 'social'] },
  { id: 'underline', name: '밑줄 긋기', desc: '형광펜 밑줄 굵기 +50%', needs: ['ruler', 'highlighter'] },
  { id: 'correction', name: '수정 완료', desc: '지우개가 지나간 자리에 수정테이프가 깔린다', needs: ['eraser', 'tape'] },
  { id: 'allnighter', name: '밤샘 공부', desc: '야간 자율학습 시간 동안 피해 +25%', needs: ['nightstudy', 'memory'] },
];

export const SYNERGY_MAP = Object.fromEntries(SYNERGIES.map((s) => [s.id, s]));

/** Field items: dropped by enemies and breakable props (trash cans, boxes). */
export const FIELD_ITEMS: { id: string; name: string; desc: string; where: string }[] = [
  { id: 'gem', name: '경험치 조각', desc: '적이 남기는 지식의 조각. 모으면 레벨이 오른다. 색이 진할수록 경험치가 많다.', where: '모든 적' },
  { id: 'allowance', name: '학교 코인', desc: '영구 성장에 쓰는 화폐. 판이 끝나면 보유 코인에 더해진다.', where: '적 · 상자' },
  { id: 'coinbag', name: '용돈 봉투', desc: '학교 코인 25개가 들어 있다.', where: '쓰레기통 · 교재 상자' },
  { id: 'food', name: '삼각김밥', desc: '체력을 25 회복한다.', where: '적 · 쓰레기통 · 교재 상자' },
  { id: 'feast', name: '급식 정식', desc: '체력을 전부 회복한다.', where: '쓰레기통 · 교재 상자 (희귀)' },
  { id: 'magnet', name: '말굽 자석', desc: '맵 위의 모든 경험치 조각을 끌어당긴다.', where: '적 · 쓰레기통 · 교재 상자' },
  { id: 'clock', name: '멈춘 시계', desc: '6초 동안 모든 적이 멈춘다. 멈춘 적은 공격하지 않는다.', where: '적 · 쓰레기통 · 교재 상자' },
  { id: 'bell', name: '비상벨', desc: '화면 안의 모든 일반 적을 한 번에 쓰러뜨린다.', where: '적 · 쓰레기통 · 교재 상자' },
  { id: 'energy', name: '에너지 드링크', desc: '8초 동안 무적이 되고 이동 속도가 30% 빨라진다.', where: '쓰레기통 · 교재 상자' },
  { id: 'chest', name: '분실물 상자', desc: '무기 진화 · 조합 조건을 갖췄다면 그것부터, 아니면 무작위 강화와 코인을 준다.', where: '중간 보스 · 보스' },
];
