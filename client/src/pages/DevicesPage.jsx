import { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill, Stroke, Circle as CircleStyle, Text } from 'ol/style';
import 'ol/ol.css';

const getRole = () => localStorage.getItem('role') || 'REVIEWER';
const getLang = () => localStorage.getItem('lang') || 'ko';

const DEV_T = {
  ko: {
    title: 'DEVICE SETTINGS',
    register: '＋ 장비 등록', edit: '✏️ 장비 수정', delete: '🗑 장비 삭제',
    profile: '📋 프로파일', setting: '⚙️ 장비 설정', geo: '🌐 GEO Fence',
    selected: (n) => `${n}개 선택됨`,
    headers: ['IMEI', 'Alias', 'Model', 'Type', '위성', '회사ID', '개통일', 'Profile', '상태', '관리'],
    noDevice: '등록된 장비 없음',
    editBtn: '수정', stopBtn: '중지', activeBtn: '활성', deleteBtn: '삭제',
    activatedMsg: '✅ 활성화 되었습니다.', stoppedMsg: '⏸ 중지 되었습니다.',
    selectOne: '장비 1개를 선택해주세요.', selectAny: '장비를 선택해주세요.',
    deleteConfirm: (n) => `${n}개 장비를 삭제하시겠습니까?`,
    deleteOneConfirm: (alias) => `${alias} 장비를 삭제하시겠습니까?`,
    // RegisterPopup
    regTitle: '📡 장비 등록', aliasLabel: '유닛 네임 (ALIAS) *', aliasPh: '장비 별칭',
    imeiLabel: 'IMEI *', imeiPh: '15자리 IMEI', searchBtn: '검색',
    imei15: 'IMEI는 15자리여야 합니다.', imeiDup: '이미 등록된 장비입니다.',
    imeiOk: '등록 가능한 장비입니다.', imeiErr: '확인 중 오류가 발생했습니다.',
    modelLabel: '장비 종류 (TYPE) *', typeLabel: '타입 *',
    profileLabel: '프로파일', profileNone: '— 선택 안 함 —',
    accountLabel: '계정 할당 *', accountNone: '— 계정 선택 —',
    openDateLabel: '개통일자 *', required: '필수 항목을 입력해주세요.',
    cancel: '취소', save: '저장', regBtn: '등록',
    // EditPopup
    editTitle: '✏️ 장비 수정',
    imeiFixed: 'IMEI (수정불가)', modelFixed: 'MODEL (수정불가)', typeFixed: 'TYPE (수정불가)',
    groupLabel: '그룹', groupPh: '그룹명',
    // ProfilePopup
    profTitle: '📋 프로파일 & Messaging Hub',
    profSosLabel: 'SOS / TRACK 알림 수신자', profNameLabel: '프로파일 명', profNamePh: '프로파일 이름',
    sosEmailLabel: 'SOS 이메일', sosKakaoLabel: 'SOS 카카오톡', trackEmailLabel: 'TRACK 이메일 수신자',
    addChannel: '+ 채널 추가', channelSave: '저장', channelCancel: '취소',
    clear: '클리어', saveSetting: '알림 설정 저장', createProfile: '+ 프로파일 생성',
    profHeaders: ['No', '프로파일명', 'SOS Email', 'TRACK Email', 'Actions'],
    noProfile: '저장된 프로파일이 없습니다.', close: '닫기',
    deleteConfirmSimple: '삭제하시겠습니까?',
    // DeviceSettingPanel
    firmware: 'Firmware', verCall: '— VER-Call 후 표시됩니다.',
    cycleTime: '주기 Time', cycleDist: '주기 Distance', unitMin: '(단위:분)', unit10m: '(단위:10m)',
    selectOption: '-- 선택 --', digits4: '4자리',
    canUse: 'CAN 사용 여부', canTime: 'CAN 시간 설정', canGpsUse: 'CAN+GPS 사용여부',
    canGpsTime: 'CAN+GPS 시간 설정', sosUse: 'SOS 사용 여부',
    recipient: '수신처', recipientUnit: '(유닛코드/IMEI)', recipientPh: '10자리(유닛코드) 또는 15자리(IMEI)',
    recipientErr: '10자리 또는 15자리만 가능합니다.',
    recipientImei: '✓ IMEI (15자리)', recipientUnit2: '✓ 유닛코드 (10자리)',
    saveAll: '💾 모든 설정 저장', ackNote: '※ ACK 수신시까지 최대 10분 대기',
    sendCmd: '전송 커맨드: ', waiting: (r, m) => `⏳ 대기 중... (${r}/${m}회)`,
    failed: (r, m) => `❌ 실패 (${r}/${m}회)`, retry: '재전송',
    maxRetry: (m) => `❌ 재전송 ${m}회 초과 — 저장 비활성화`, success: '✅ 성공',
    deviceCall: 'DEVICE CALL', callNote: '※ 클릭 후 1분간 전체 비활성화',
    noChange: '변경된 항목이 없습니다.', maxRetryAlert: '재전송 횟수(3회)를 초과했습니다. 저장이 비활성화됩니다.',
    maxRetryAlert2: '재전송 횟수(3회)를 초과했습니다.',
    gpsLabels: { '0': '없음', '1': '약함', '2': '보통', '3': '최상' },
    signalLabels: { '0': '없음', '1': '매우약함', '2': '보통', '3': '정상', '4': '양호', '5': '최상' },
    // GeoFence
    geoTitle: 'GEO FENCE CONFIGURATION', geoDevice: 'Device:',
    geoIntersect: '⚠️ 선분이 교차됩니다. 다른 위치를 선택해주세요.',
    geoDrawNote: (max) => `지도 클릭으로 꼭짓점 추가 (최소 3개, 최대 ${max}개)`,
    geoCoordList: 'COORDINATE LIST', geoClickNote: '지도를 클릭하여 꼭짓점을 추가하세요',
    geoSlot: 'GEO-SETTING 슬롯 (1-5)', geoLastSent: '📡 마지막 전송:',
    geoSavedSlot: (n, m) => `✓ 저장된 슬롯: ${n}개 꼭짓점 / ${m}`,
    geoCmdPreview: 'COMMAND PREVIEW', geoCmdNote: '— 포트 3개 이상 추가 후 생성됩니다 —',
    geoGuideTitle: '📌 사용 안내',
    geoGuide1: '• 슬롯(GEO-1~5)을 클릭하여 선택하세요.',
    geoGuide2: ['• 지도에서 꼭짓점을 추가 후 ', '저장', '하면 슬롯이 ', '빨간색', '으로 변합니다.'],
    geoGuide3: '• 새 슬롯을 선택해 추가 저장할 수 있습니다. (총 5개)',
    geoGuide4: ['• ', '전송', '이 완료된 슬롯은 ', '노란색', '으로 변합니다.'],
    geoGuide5: '※ 전송 후 2분간 잠금 / 실패 시 최대 3회 자동 재시도',
    geoGuide6: '💡 노란색 슬롯은 지도 상세보기창의 GEO Fence 버튼을 클릭하면 지도에서 확인 가능합니다.',
    geoWaiting: (r, m) => `⏳ 대기 중... (${r}/${m}회)`,
    geoFailed: (r, m) => `❌ 실패 (${r}/${m}회)`, geoRetry: '재전송',
    geoMaxRetry: (m) => `❌ 재전송 ${m}회 초과 — 잠금`, geoSuccess: '✅ 전송 성공',
    geoLocked: '🔒 2분간 잠금 중...',
    geoSaveBtn: '💾 저장', geoSendBtn: '▶ 전송',
    geoSlotSelect: 'GEO 슬롯을 선택해주세요.', geoMinPts: '최소 3개 좌표가 필요합니다.',
    geoSaved: (slot) => `${slot}에 저장 완료!`, geoSaveFail: '저장 실패',
    geoLockAlert: '전송 후 2분간 잠금됩니다.', geoMaxRetryAlert: '재전송 3회 초과',
    min: '분', hour: '시간',
    ttG1on: 'GEO 서비스 활성화',
    ttG2off: 'GEO 서비스 비활성화',
    ttDef1: '해당 구역으로 들어올 때 작동합니다',
    ttDef2: '해당 구역에서 나갈 때 작동합니다',
    ttDef3: '진입/이탈 둘 다 조건으로 작동합니다',
    ttIntervalS: '들어올 때(진입) 시간 인터벌입니다',
    ttIntervalT: '나갈 때(이탈) 시간 인터벌입니다',
    tipFirmware: '장비 펌웨어 버전입니다.',
    tipMode: '위치정보입니다. CAR는 위도/경도만, UAV는 위도/경도/방향/속도/고도, UAT는 위도/경도/방향/속도/고도/발송시간을 표시합니다.',
    tipEvent: '해당 장비의 EVENT 사용여부입니다.',
    tipTime: '위치보고 시간 주기값입니다. 주기DISTANCE와 동시에 작동됩니다.',
    tipDist: '위치보고 거리 주기값입니다. 1은 10미터입니다. 주기TIME과 동시에 작동됩니다.',
    tipCan: 'CAN 데이터 사용여부입니다.',
    tipCanTime: 'CAN 시간 설정입니다.',
    tipCanGps: 'CAN + 위치정보 사용여부입니다.',
    tipCanGpsTime: 'CAN + 위치정보 시간 설정입니다.',
    tipSos: 'SOS 사용여부입니다.',
    tipAddr: '수신처 변경이 가능합니다.',
  },
  en: {
    title: 'DEVICE SETTINGS',
    register: '＋ Register', edit: '✏️ Edit', delete: '🗑 Delete',
    profile: '📋 Profile', setting: '⚙️ Settings', geo: '🌐 GEO Fence',
    selected: (n) => `${n} selected`,
    headers: ['IMEI', 'Alias', 'Model', 'Type', 'Satellite', 'Company', 'Open Date', 'Profile', 'Status', 'Manage'],
    noDevice: 'No devices registered',
    editBtn: 'Edit', stopBtn: 'Stop', activeBtn: 'Enable', deleteBtn: 'Delete',
    activatedMsg: '✅ Activated.', stoppedMsg: '⏸ Stopped.',
    selectOne: 'Please select 1 device.', selectAny: 'Please select a device.',
    deleteConfirm: (n) => `Delete ${n} device(s)?`,
    deleteOneConfirm: (alias) => `Delete device ${alias}?`,
    regTitle: '📡 Register Device', aliasLabel: 'Unit Name (ALIAS) *', aliasPh: 'Device alias',
    imeiLabel: 'IMEI *', imeiPh: '15-digit IMEI', searchBtn: 'Search',
    imei15: 'IMEI must be 15 digits.', imeiDup: 'Already registered.',
    imeiOk: 'Available to register.', imeiErr: 'Error occurred.',
    modelLabel: 'Device Type *', typeLabel: 'Type *',
    profileLabel: 'Profile', profileNone: '— None —',
    accountLabel: 'Assign Account *', accountNone: '— Select Account —',
    openDateLabel: 'Activation Date *', required: 'Please fill in required fields.',
    cancel: 'Cancel', save: 'Save', regBtn: 'Register',
    editTitle: '✏️ Edit Device',
    imeiFixed: 'IMEI (read-only)', modelFixed: 'MODEL (read-only)', typeFixed: 'TYPE (read-only)',
    groupLabel: 'Group', groupPh: 'Group name',
    profTitle: '📋 Profile & Messaging Hub',
    profSosLabel: 'SOS / TRACK Alert Recipients', profNameLabel: 'Profile Name', profNamePh: 'Profile name',
    sosEmailLabel: 'SOS Email', sosKakaoLabel: 'SOS KakaoTalk', trackEmailLabel: 'TRACK Email',
    addChannel: '+ Add Channel', channelSave: 'Save', channelCancel: 'Cancel',
    clear: 'Clear', saveSetting: 'Save Alert Settings', createProfile: '+ Create Profile',
    profHeaders: ['No', 'Profile Name', 'SOS Email', 'TRACK Email', 'Actions'],
    noProfile: 'No profiles saved.', close: 'Close',
    deleteConfirmSimple: 'Delete this item?',
    firmware: 'Firmware', verCall: '— Shows after VER-Call —',
    cycleTime: 'Cycle Time', cycleDist: 'Cycle Distance', unitMin: '(unit: min)', unit10m: '(unit: 10m)',
    selectOption: '-- Select --', digits4: '4 digits',
    canUse: 'CAN Enable', canTime: 'CAN Time Setting', canGpsUse: 'CAN+GPS Enable',
    canGpsTime: 'CAN+GPS Time Setting', sosUse: 'SOS Enable',
    recipient: 'Recipient', recipientUnit: '(Unit Code/IMEI)', recipientPh: '10-digit (unit) or 15-digit (IMEI)',
    recipientErr: 'Must be 10 or 15 digits.',
    recipientImei: '✓ IMEI (15 digits)', recipientUnit2: '✓ Unit Code (10 digits)',
    saveAll: '💾 Save All Settings', ackNote: '※ Wait up to 10 min for ACK',
    sendCmd: 'Command: ', waiting: (r, m) => `⏳ Waiting... (${r}/${m})`,
    failed: (r, m) => `❌ Failed (${r}/${m})`, retry: 'Retry',
    maxRetry: (m) => `❌ ${m} retries exceeded — disabled`, success: '✅ Success',
    deviceCall: 'DEVICE CALL', callNote: '※ Disabled for 1 min after click',
    noChange: 'No changes detected.', maxRetryAlert: 'Max retries (3) exceeded. Save disabled.',
    maxRetryAlert2: 'Max retries (3) exceeded.',
    gpsLabels: { '0': 'None', '1': 'Weak', '2': 'Fair', '3': 'Best' },
    signalLabels: { '0': 'None', '1': 'Very Weak', '2': 'Fair', '3': 'Normal', '4': 'Good', '5': 'Best' },
    geoTitle: 'GEO FENCE CONFIGURATION', geoDevice: 'Device:',
    geoIntersect: '⚠️ Segments intersect. Choose a different location.',
    geoDrawNote: (max) => `Click map to add vertices (min 3, max ${max})`,
    geoCoordList: 'COORDINATE LIST', geoClickNote: 'Click the map to add vertices',
    geoSlot: 'GEO-SETTING Slots (1-5)', geoLastSent: '📡 Last Sent:',
    geoSavedSlot: (n, m) => `✓ Saved: ${n} vertices / ${m}`,
    geoCmdPreview: 'COMMAND PREVIEW', geoCmdNote: '— Add 3+ points to generate —',
    geoGuideTitle: '📌 Instructions',
    geoGuide1: '• Click a slot (GEO-1~5) to select.',
    geoGuide2: ['• Add vertices then click ', 'Save', ' — slot turns ', 'red', '.'],
    geoGuide3: '• Select another slot to save more. (max 5)',
    geoGuide4: ['• After ', 'Send', ', slot turns ', 'yellow', '.'],
    geoGuide5: '※ Locked 2 min after send / max 3 retries on failure',
    geoGuide6: '💡 Yellow slots can be viewed via GEO Fence button in map detail view.',
    geoWaiting: (r, m) => `⏳ Waiting... (${r}/${m})`,
    geoFailed: (r, m) => `❌ Failed (${r}/${m})`, geoRetry: 'Retry',
    geoMaxRetry: (m) => `❌ ${m} retries exceeded — locked`, geoSuccess: '✅ Send Success',
    geoLocked: '🔒 Locked for 2 min...',
    geoSaveBtn: '💾 Save', geoSendBtn: '▶ Send',
    geoSlotSelect: 'Please select a GEO slot.', geoMinPts: 'Minimum 3 coordinates required.',
    geoSaved: (slot) => `Saved to ${slot}!`, geoSaveFail: 'Save failed',
    geoLockAlert: 'Locked for 2 min after send.', geoMaxRetryAlert: '3 retries exceeded',
    min: 'min', hour: 'hr',
    ttG1on: 'Activate GEO service',
    ttG2off: 'Deactivate GEO service',
    ttDef1: 'Triggers when entering the zone',
    ttDef2: 'Triggers when exiting the zone',
    ttDef3: 'Triggers on both entry and exit',
    ttIntervalS: 'Time interval for zone entry',
    ttIntervalT: 'Time interval for zone exit',
    tipFirmware: 'Device firmware version.',
    tipMode: 'Location mode. CAR: lat/lon only. UAV: lat/lon/heading/speed/alt. UAT: lat/lon/heading/speed/alt/time.',
    tipEvent: 'EVENT function on/off for this device.',
    tipTime: 'Location report time interval. Works simultaneously with Distance cycle.',
    tipDist: 'Location report distance interval. 1 = 10 meters. Works simultaneously with Time cycle.',
    tipCan: 'CAN data usage on/off.',
    tipCanTime: 'CAN time interval setting.',
    tipCanGps: 'CAN + location data usage on/off.',
    tipCanGpsTime: 'CAN + location time interval setting.',
    tipSos: 'SOS function on/off.',
    tipAddr: 'Change the recipient address.',
  },
  ja: {
    title: 'デバイス設定',
    register: '＋ デバイス登録', edit: '✏️ 編集', delete: '🗑 削除',
    profile: '📋 プロファイル', setting: '⚙️ デバイス設定', geo: '🌐 GEO Fence',
    selected: (n) => `${n}個選択中`,
    headers: ['IMEI', 'エイリアス', 'モデル', 'タイプ', '衛星', '会社ID', '開通日', 'プロファイル', '状態', '管理'],
    noDevice: '登録済みデバイスなし',
    editBtn: '編集', stopBtn: '停止', activeBtn: '有効', deleteBtn: '削除',
    activatedMsg: '✅ 有効化されました。', stoppedMsg: '⏸ 停止されました。',
    selectOne: 'デバイスを1つ選択してください。', selectAny: 'デバイスを選択してください。',
    deleteConfirm: (n) => `${n}個のデバイスを削除しますか？`,
    deleteOneConfirm: (alias) => `デバイス ${alias} を削除しますか？`,
    regTitle: '📡 デバイス登録', aliasLabel: 'ユニット名 (ALIAS) *', aliasPh: 'デバイスエイリアス',
    imeiLabel: 'IMEI *', imeiPh: '15桁のIMEI', searchBtn: '検索',
    imei15: 'IMEIは15桁である必要があります。', imeiDup: '既に登録済みです。',
    imeiOk: '登録可能なデバイスです。', imeiErr: 'エラーが発生しました。',
    modelLabel: 'デバイス種類 *', typeLabel: 'タイプ *',
    profileLabel: 'プロファイル', profileNone: '— 選択なし —',
    accountLabel: 'アカウント割当 *', accountNone: '— アカウント選択 —',
    openDateLabel: '開通日 *', required: '必須項目を入力してください。',
    cancel: 'キャンセル', save: '保存', regBtn: '登録',
    editTitle: '✏️ デバイス編集',
    imeiFixed: 'IMEI (変更不可)', modelFixed: 'MODEL (変更不可)', typeFixed: 'TYPE (変更不可)',
    groupLabel: 'グループ', groupPh: 'グループ名',
    profTitle: '📋 プロファイル & メッセージングハブ',
    profSosLabel: 'SOS / TRACK 通知受信者', profNameLabel: 'プロファイル名', profNamePh: 'プロファイル名',
    sosEmailLabel: 'SOS メール', sosKakaoLabel: 'SOS カカオトーク', trackEmailLabel: 'TRACK メール',
    addChannel: '+ チャンネル追加', channelSave: '保存', channelCancel: 'キャンセル',
    clear: 'クリア', saveSetting: '通知設定を保存', createProfile: '+ プロファイル作成',
    profHeaders: ['No', 'プロファイル名', 'SOS Email', 'TRACK Email', '操作'],
    noProfile: '保存されたプロファイルがありません。', close: '閉じる',
    deleteConfirmSimple: '削除しますか？',
    firmware: 'ファームウェア', verCall: '— VER-Call後に表示されます —',
    cycleTime: '周期 Time', cycleDist: '周期 Distance', unitMin: '(単位:分)', unit10m: '(単位:10m)',
    selectOption: '-- 選択 --', digits4: '4桁',
    canUse: 'CAN 使用', canTime: 'CAN 時間設定', canGpsUse: 'CAN+GPS 使用',
    canGpsTime: 'CAN+GPS 時間設定', sosUse: 'SOS 使用',
    recipient: '受信先', recipientUnit: '(ユニットコード/IMEI)', recipientPh: '10桁(ユニット)または15桁(IMEI)',
    recipientErr: '10桁または15桁のみ有効です。',
    recipientImei: '✓ IMEI (15桁)', recipientUnit2: '✓ ユニットコード (10桁)',
    saveAll: '💾 全設定を保存', ackNote: '※ ACK受信まで最大10分待機',
    sendCmd: '送信コマンド: ', waiting: (r, m) => `⏳ 待機中... (${r}/${m}回)`,
    failed: (r, m) => `❌ 失敗 (${r}/${m}回)`, retry: '再送信',
    maxRetry: (m) => `❌ 再送信${m}回超過 — 無効`, success: '✅ 成功',
    deviceCall: 'デバイスコール', callNote: '※ クリック後1分間無効',
    noChange: '変更項目がありません。', maxRetryAlert: '再送信回数(3回)を超えました。保存が無効になります。',
    maxRetryAlert2: '再送信回数(3回)を超えました。',
    gpsLabels: { '0': 'なし', '1': '弱', '2': '普通', '3': '最良' },
    signalLabels: { '0': 'なし', '1': '非常に弱', '2': '普通', '3': '正常', '4': '良好', '5': '最良' },
    geoTitle: 'GEO FENCE CONFIGURATION', geoDevice: 'デバイス:',
    geoIntersect: '⚠️ 線分が交差しています。別の位置を選択してください。',
    geoDrawNote: (max) => `地図をクリックして頂点を追加 (最小3、最大${max})`,
    geoCoordList: '座標リスト', geoClickNote: '地図をクリックして頂点を追加してください',
    geoSlot: 'GEO設定スロット (1-5)', geoLastSent: '📡 最終送信:',
    geoSavedSlot: (n, m) => `✓ 保存済: ${n}頂点 / ${m}`,
    geoCmdPreview: 'コマンドプレビュー', geoCmdNote: '— 3点以上追加後に生成されます —',
    geoGuideTitle: '📌 使用方法',
    geoGuide1: '• スロット(GEO-1~5)をクリックして選択。',
    geoGuide2: ['• 頂点を追加後 ', '保存', ' するとスロットが ', '赤色', ' に変わります。'],
    geoGuide3: '• 別スロットを選択して追加保存できます。(最大5個)',
    geoGuide4: ['• ', '送信', ' 完了後スロットが ', '黄色', ' に変わります。'],
    geoGuide5: '※ 送信後2分ロック / 失敗時最大3回リトライ',
    geoGuide6: '💡 黄色スロットは地図詳細画面のGEO Fenceボタンで確認できます。',
    geoWaiting: (r, m) => `⏳ 待機中... (${r}/${m}回)`,
    geoFailed: (r, m) => `❌ 失敗 (${r}/${m}回)`, geoRetry: '再送信',
    geoMaxRetry: (m) => `❌ 再送信${m}回超過 — ロック`, geoSuccess: '✅ 送信成功',
    geoLocked: '🔒 2分間ロック中...',
    geoSaveBtn: '💾 保存', geoSendBtn: '▶ 送信',
    geoSlotSelect: 'GEOスロットを選択してください。', geoMinPts: '最低3座標が必要です。',
    geoSaved: (slot) => `${slot}に保存完了！`, geoSaveFail: '保存失敗',
    geoLockAlert: '送信後2分間ロックされます。', geoMaxRetryAlert: '再送信3回超過',
    min: '分', hour: '時間',
    ttG1on: 'GEOサービスを有効化',
    ttG2off: 'GEOサービスを無効化',
    ttDef1: '対象エリアに入ったときに作動します',
    ttDef2: '対象エリアから出たときに作動します',
    ttDef3: '進入・離脱の両方で作動します',
    ttIntervalS: '進入時の時間インターバルです',
    ttIntervalT: '離脱時の時間インターバルです',
    tipFirmware: 'デバイスファームウェアバージョンです。',
    tipMode: '位置情報モードです。CAR:緯度経度のみ、UAV:緯度経度方向速度高度、UAT:緯度経度方向速度高度送信時間。',
    tipEvent: 'このデバイスのEVENT使用可否です。',
    tipTime: '位置報告時間周期値です。距離周期と同時に動作します。',
    tipDist: '位置報告距離周期値です。1は10メートルです。時間周期と同時に動作します。',
    tipCan: 'CANデータ使用可否です。',
    tipCanTime: 'CAN時間設定です。',
    tipCanGps: 'CAN+位置情報使用可否です。',
    tipCanGpsTime: 'CAN+位置情報時間設定です。',
    tipSos: 'SOS使用可否です。',
    tipAddr: '受信先の変更が可能です。',
  },
};

export default function DevicesPage({ devices, onRefresh }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [showRegister, setShowRegister] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showDeviceSetting, setShowDeviceSetting] = useState(false);
  const [showGeo, setShowGeo] = useState(false);
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const PER_PAGE = 10;

  const fetchUsers = async () => {
    try { const r = await api.get('/users'); setUsers(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); }
  };

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
  }, []);

  const toggleSelect = (imei) => {
    setSelected(p => p.includes(imei) ? p.filter(i => i !== imei) : [...p, imei]);
  };

  const toggleAll = () => {
    setSelected(selected.length === devices.length ? [] : devices.map(d => d.imei));
  };

  const selectedDevices = devices.filter(d => selected.includes(d.imei));
  const totalPages = Math.ceil(devices.length / PER_PAGE);
  const paged = devices.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const btnStyle = (color = '#00d4f0', disabled = false) => ({
    padding: '6px 14px', borderRadius: '7px', border: `1px solid ${color}40`,
    background: `${color}15`, color: disabled ? '#4b6483' : color,
    cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700',
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
  });

  const myRole = getRole();
  const canEdit = myRole === 'SUPER_ADMIN' || myRole === 'ADMIN';
  const canEditDevice = myRole === 'SUPER_ADMIN' || myRole === 'ADMIN' || myRole === 'REVIEWER';
  // const isSuperAdmin = myRole === 'SUPER_ADMIN';

  return (
    <div style={{ padding: '16px', flex: 1, overflowY: 'auto', background: '#0d1628' }}>

      {/* 헤더 + 액션 버튼 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', letterSpacing: '2px', color: '#00d4f0', marginRight: '8px' }}>
          {t.title}
        </span>
        <button onClick={onRefresh} style={btnStyle('#6b8fae')}>↻</button>

        {/* 장비 등록 — Super Admin + Admin */}
        {canEdit && (
          <button onClick={() => setShowRegister(true)} style={btnStyle('#10b981')}>
            {t.register}
          </button>
        )}

        {/* 장비 수정 — Reviewer 이상, 1개 선택 시 */}
        {canEditDevice && (
          <button onClick={() => selected.length === 1 ? setShowEdit(true) : alert(t.selectOne)}
            style={btnStyle('#00d4f0', selected.length !== 1)}>
            {t.edit}
          </button>
        )}

        {/* 장비 삭제 — Super Admin + Admin */}
        {canEdit && (
          <button onClick={async () => {
            if (selected.length === 0) { alert(t.selectAny); return; }
            if (!confirm(t.deleteConfirm(selected.length))) return;
            for (const imei of selected) { try { await api.delete(`/devices/${imei}`); } catch { } }
            setSelected([]); onRefresh();
          }} style={btnStyle('#ef4444', selected.length === 0)}>
            {t.delete}
          </button>
        )}

        {/* 프로파일 — Reviewer 이상 */}
        {canEditDevice && (
          <button onClick={() => setShowProfile(true)} style={btnStyle('#8b5cf6')}>
            {t.profile}
          </button>
        )}

        {/* 장비 설정 — Reviewer 이상, 1개 선택 */}
        {canEditDevice && (
          <button onClick={() => selected.length === 1 ? setShowDeviceSetting(true) : alert(t.selectOne)}
            style={btnStyle('#f59e0b', selected.length !== 1)}>
            {t.setting}
          </button>
        )}

        {/* GEO Fence — 1개 선택 시만 활성화 */}
        <button onClick={() => selected.length === 1 ? setShowGeo(true) : alert(t.selectOne)}
          style={btnStyle('#10b981', selected.length !== 1)}>
          {t.geo}
        </button>

        {selected.length > 0 && (
          <span style={{ fontSize: '10px', color: '#6b8fae', marginLeft: '4px' }}>
            {t.selected(selected.length)}
          </span>
        )}
      </div>

      {/* 장비 테이블 */}
      <div style={{ border: '1px solid rgba(0,212,240,.18)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'center', width: '36px' }}>
                <input type="checkbox" checked={selected.length === devices.length && devices.length > 0}
                  onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              {[...t.headers.slice(0, 8), ...(canEdit ? [t.headers[8]] : [])].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '1px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#6b8fae' }}>{t.noDevice}</td></tr>
            ) : paged.map((d, i) => {
              const isActive = d.active !== false; // DB active 기준
              const isSelected = selected.includes(d.imei);
              return (
                <tr key={d.imei}
                  onClick={() => toggleSelect(d.imei)}
                  style={{ borderBottom: '1px solid rgba(0,212,240,.05)', cursor: 'pointer', background: isSelected ? 'rgba(0,212,240,.08)' : 'transparent', transition: 'background .15s' }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,212,240,.04)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(d.imei)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '8px 10px', color: '#7dd3fc', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{d.imei}</td>
                  <td style={{ padding: '8px 10px', color: '#fff', fontWeight: '700' }}>{d.alias}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.model || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.type || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.satellite || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>{d.registeredByCompany || '-'}</td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae', fontSize: '10px' }}>
                    {d.openDate ? `${String(d.openDate).slice(0, 4)}-${String(d.openDate).slice(4, 6)}-${String(d.openDate).slice(6, 8)}` : '-'}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#6b8fae' }}>{d.profileName || '-'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', background: isActive ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: isActive ? '#10b981' : '#ef4444' }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td style={{ padding: '6px 10px', minWidth: '160px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* 수정 */}
                        <button onClick={() => { setSelected([d.imei]); setShowEdit(true); }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(0,212,240,.4)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {t.editBtn}
                        </button>
                        {/* 중지/활성 토글 */}
                        <button onClick={async () => {
                          try {
                            const res = await api.put(`/devices/${d.imei}/toggle`);
                            const newActive = res.data?.active;
                            alert(newActive ? t.activatedMsg : t.stoppedMsg);
                            onRefresh();
                          } catch (e) { alert(e.response?.data?.message || '변경 실패'); }
                        }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: `1px solid ${isActive ? 'rgba(245,158,11,.4)' : 'rgba(16,185,129,.4)'}`, background: isActive ? 'rgba(245,158,11,.1)' : 'rgba(16,185,129,.1)', color: isActive ? '#f59e0b' : '#10b981', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {isActive ? t.stopBtn : t.activeBtn}
                        </button>
                        {/* 삭제 */}
                        <button onClick={async () => {
                          if (!confirm(t.deleteOneConfirm(d.alias))) return;
                          try {
                            await api.delete(`/devices/${d.imei}`);
                            setSelected(p => p.filter(i => i !== d.imei));
                            onRefresh();
                          } catch (e) { alert(e.response?.data?.message || '삭제 실패'); }
                        }}
                          style={{ padding: '3px 8px', borderRadius: '5px', border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: '#ef4444', fontSize: '9px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {t.deleteBtn}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
              {devices.length}개 / {page}/{totalPages}p
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPage(1)} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === 1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} style={{ padding: '3px 8px', background: p === page ? '#00d4f0' : 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: p === page ? '#0d1628' : '#00d4f0', cursor: 'pointer', fontSize: '10px', fontWeight: p === page ? '700' : '400' }}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ padding: '3px 8px', background: 'rgba(0,212,240,.1)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '5px', color: '#00d4f0', cursor: 'pointer', fontSize: '10px', opacity: page === totalPages ? 0.3 : 1 }}>»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 장비 등록 팝업 ── */}
      {showRegister && (
        <RegisterPopup
          profiles={profiles} users={users}
          onClose={() => setShowRegister(false)}
          onSave={() => { setShowRegister(false); onRefresh(); }}
        />
      )}

      {/* ── 장비 수정 팝업 ── */}
      {showEdit && selectedDevices.length === 1 && (
        <EditPopup
          device={selectedDevices[0]} profiles={profiles}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); setSelected([]); onRefresh(); }}
        />
      )}

      {/* ── 프로파일 팝업 ── */}
      {showProfile && (
        <ProfilePopup onClose={() => setShowProfile(false)} />
      )}

      {/* ── 장비 설정 패널 ── */}
      {showDeviceSetting && selectedDevices.length === 1 && (
        <DeviceSettingPanel
          device={selectedDevices[0]}
          onClose={() => setShowDeviceSetting(false)}
        />
      )}

      {/* ── GEO Fence ── */}
      {showGeo && (
        <GeoFencePanel
          devices={devices}
          selectedDevice={selectedDevices.length === 1 ? selectedDevices[0] : null}
          onClose={() => setShowGeo(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   장비 등록 팝업
══════════════════════════════════════ */
function RegisterPopup({ profiles, users, onClose, onSave }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const myRole = getRole();
  const isSuperAdmin = myRole === 'SUPER_ADMIN';

  const [form, setForm] = useState({
    alias: '', imei: '', model: 'TYTO2', type: 'SBD',
    satellite: 'IRIDIUM', profileName: '', assignedUserId: '', openDate: '',
    registeredByCompany: '',
  });
  const [imeiMsg, setImeiMsg] = useState({ text: '', ok: false });

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };

  const checkImei = async () => {
    if (form.imei.length !== 15) { setImeiMsg({ text: t.imei15, ok: false }); return; }
    try {
      const res = await api.get(`/devices/${form.imei}`);
      if (res.data) setImeiMsg({ text: t.imeiDup, ok: false });
    } catch (e) {
      if (e.response?.status === 404) setImeiMsg({ text: t.imeiOk, ok: true });
      else setImeiMsg({ text: t.imeiErr, ok: false });
    }
  };

  const handleSave = async () => {
    if (!form.alias || !form.imei || !form.model || !form.type) { alert(t.required); return; }
    if (isSuperAdmin && !form.registeredByCompany) { alert('Company를 선택해주세요.'); return; }
    try {
      await api.post('/devices', form);
      onSave();
    } catch (e) { alert(e.response?.data?.message || '등록 실패'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>{t.regTitle}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* 유닛 네임 */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>{t.aliasLabel}</label>
            <input style={inp} value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} placeholder={t.aliasPh} />
          </div>

          {/* IMEI */}
          <div>
            <label style={lbl}>{t.imeiLabel}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...inp, flex: 1 }} value={form.imei}
                onChange={e => { setForm(p => ({ ...p, imei: e.target.value.replace(/\D/g, '').slice(0, 15) })); setImeiMsg({ text: '', ok: false }); }}
                placeholder={t.imeiPh} maxLength={15} />
              <button onClick={checkImei}
                style={{ padding: '0 14px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '8px', color: '#00d4f0', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.searchBtn}
              </button>
            </div>
            {imeiMsg.text && <p style={{ fontSize: '10px', color: imeiMsg.ok ? '#10b981' : '#ef4444', marginTop: '4px' }}>{imeiMsg.text}</p>}
          </div>

          {/* Satellite */}
          <div>
            <label style={lbl}>SATELLITE COMPANY *</label>
            <select style={inp} value={form.satellite} onChange={e => setForm(p => ({ ...p, satellite: e.target.value }))}>
              <option value="IRIDIUM">Iridium</option>
              <option value="GLOBALSTAR">Globalstar</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label style={lbl}>{t.modelLabel}</label>
            <select style={inp} value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))}>
              <option value="TYTO2">TYTO2</option>
              <option value="TYTO5">TYTO5</option>
              <option value="TYTO6">TYTO6</option>
              <option value="TYTO100">TYTO100</option>
              <option value="9704">9704</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={lbl}>{t.typeLabel}</label>
            <select style={inp} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="SBD">SBD</option>
              <option value="IMT">IMT</option>
            </select>
          </div>

          {/* 프로파일 */}
          <div>
            <label style={lbl}>{t.profileLabel}</label>
            <select style={inp} value={form.profileName} onChange={e => setForm(p => ({ ...p, profileName: e.target.value }))}>
              <option value="">{t.profileNone}</option>
              {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          {/* 계정 할당 — SUPER_ADMIN만 표시 */}
          {isSuperAdmin && (
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>COMPANY 할당 * <span style={{ color: '#4b6483', fontSize: '9px' }}>해당 회사 ADMIN이 장비를 관리합니다</span></label>
              <select style={inp} value={form.registeredByCompany || ''} onChange={e => setForm(p => ({ ...p, registeredByCompany: e.target.value, assignedUserId: '' }))}>
                <option value="">— Company 선택 —</option>
                {[...new Set(users.filter(u => u.role === 'ADMIN' && u.companyId).map(u => u.companyId))].map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              {form.registeredByCompany && (
                <div style={{ marginTop: '6px', padding: '6px 10px', background: 'rgba(0,212,240,.05)', border: '1px solid rgba(0,212,240,.15)', borderRadius: '6px', fontSize: '10px', color: '#6b8fae' }}>
                  👤 소속 ADMIN: {users.filter(u => u.companyId === form.registeredByCompany && u.role === 'ADMIN').map(u => `${u.name} (${u.loginId})`).join(', ') || '없음'}
                </div>
              )}
            </div>
          )}

          {/* 개통일자 */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>{t.openDateLabel}</label>
            <input style={{ ...inp, colorScheme: 'dark' }} type="date"
              value={form.openDate ? `${form.openDate.slice(0, 4)}-${form.openDate.slice(4, 6)}-${form.openDate.slice(6, 8)}` : ''}
              onChange={e => setForm(p => ({ ...p, openDate: e.target.value.replace(/-/g, '') }))} />
          </div>

        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>{t.cancel}</button>
          <button onClick={handleSave} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.regBtn}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   장비 수정 팝업
══════════════════════════════════════ */
function EditPopup({ device, profiles, onClose, onSave }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const [form, setForm] = useState({
    alias: device.alias || '',
    profileName: device.profileName || '',
    group: device.group || '',
  });

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };
  const fixedStyle = { ...inp, color: '#6b8fae', background: 'rgba(0,0,0,.5)', cursor: 'not-allowed' };

  const handleSave = async () => {
    try {
      await api.put(`/devices/${device.imei}`, form);
      onSave();
    } catch (e) { alert(e.response?.data?.message || '수정 실패'); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '480px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#00d4f0' }}>{t.editTitle}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* 수정 불가 항목 표시 */}
        <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[[t.imeiFixed, device.imei], [t.modelFixed, device.model], [t.typeFixed, device.type]].map(([label, val]) => (
            <div key={label}>
              <label style={{ ...lbl, color: '#4b6483' }}>{label}</label>
              <div style={fixedStyle}>{val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={lbl}>{t.aliasLabel}</label>
            <input style={inp} value={form.alias} onChange={e => setForm(p => ({ ...p, alias: e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>{t.profileLabel}</label>
            <select style={inp} value={form.profileName} onChange={e => setForm(p => ({ ...p, profileName: e.target.value }))}>
              <option value="">{t.profileNone}</option>
              {profiles.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{t.groupLabel}</label>
            <input style={inp} value={form.group} onChange={e => setForm(p => ({ ...p, group: e.target.value }))} placeholder={t.groupPh} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>{t.cancel}</button>
          <button onClick={handleSave} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg,#00d4f0,#0891b2)', color: '#0d1628', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>{t.save}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   프로파일 팝업
══════════════════════════════════════ */
function ProfilePopup({ onClose }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const [profiles, setProfiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sosEmail: '', sosKakao: '', trackEmail: '', channels: [] });
  const [channelForm, setChannelForm] = useState({ channelName: '', channelId: '', ttl: '', endpoints: [''] });
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [page, setPage] = useState(1);
  const PER = 10;

  const fetchProfiles = async () => {
    try { const r = await api.get('/profiles'); setProfiles(Array.isArray(r.data) ? r.data : []); } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProfiles(); }, []);

  const saveProfile = async () => {
    try {
      await api.post('/profiles', form);
      setShowForm(false);
      setForm({ name: '', sosEmail: '', sosKakao: '', trackEmail: '', channels: [] });
      fetchProfiles();
    } catch (e) { alert(e.response?.data?.message || '저장 실패'); }
  };

  const deleteProfile = async (id) => {
    if (!confirm(t.deleteConfirmSimple)) return;
    try { await api.delete(`/profiles/${id}`); fetchProfiles(); } catch { }
  };

  const addChannel = () => {
    setForm(p => ({ ...p, channels: [...p.channels, { ...channelForm }] }));
    setChannelForm({ channelName: '', channelId: '', ttl: '', endpoints: [''] });
    setShowChannelForm(false);
  };

  const inp = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)', color: '#fff', fontSize: '12px', boxSizing: 'border-box', outline: 'none' };
  const lbl = { fontSize: '10px', color: '#6b8fae', display: 'block', marginBottom: '5px', fontWeight: '600' };

  const totalPages = Math.ceil(profiles.length / PER);
  const paged = profiles.slice((page - 1) * PER, page * PER);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', padding: '28px', width: '700px', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>{t.profTitle}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {/* 프로파일 등록 폼 */}
        {showForm ? (
          <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700', marginBottom: '12px' }}>{t.profSosLabel}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>{t.profNameLabel}</label>
                <input style={inp} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t.profNamePh} />
              </div>
              <div>
                <label style={lbl}>{t.sosEmailLabel}</label>
                <input style={inp} type="email" value={form.sosEmail} onChange={e => setForm(p => ({ ...p, sosEmail: e.target.value }))} placeholder="sos@example.com" />
              </div>
              <div>
                <label style={lbl}>{t.sosKakaoLabel}</label>
                <input style={inp} value={form.sosKakao} onChange={e => setForm(p => ({ ...p, sosKakao: e.target.value }))} placeholder="카카오톡 ID" />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>{t.trackEmailLabel}</label>
                <input style={inp} type="email" value={form.trackEmail} onChange={e => setForm(p => ({ ...p, trackEmail: e.target.value }))} placeholder="track@example.com" />
              </div>
            </div>

            {/* Messaging Hub */}
            <div style={{ borderTop: '1px solid rgba(139,92,246,.3)', paddingTop: '12px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: '700' }}>MESSAGING HUB</span>
                <button onClick={() => setShowChannelForm(true)}
                  style={{ padding: '4px 12px', background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '6px', color: '#8b5cf6', fontSize: '10px', cursor: 'pointer' }}>
                  {t.addChannel}
                </button>
              </div>
              <div style={{ fontSize: '9px', color: '#4b6483', marginBottom: '8px' }}>Minimum SkyLink firmware version needed for this feature: 2.33</div>

              {showChannelForm && (
                <div style={{ background: 'rgba(0,0,0,.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <div><label style={lbl}>CHANNEL NAME</label><input style={inp} value={channelForm.channelName} onChange={e => setChannelForm(p => ({ ...p, channelName: e.target.value }))} placeholder="channel_name" /></div>
                    <div><label style={lbl}>CHANNEL ID</label><input style={inp} value={channelForm.channelId} onChange={e => setChannelForm(p => ({ ...p, channelId: e.target.value }))} placeholder="channelid" /></div>
                    <div><label style={lbl}>TTL</label><input style={inp} value={channelForm.ttl} onChange={e => setChannelForm(p => ({ ...p, ttl: e.target.value }))} placeholder="ttl (초)" /></div>
                    <div>
                      <label style={lbl}>ENDPOINT (누른으로 추가)</label>
                      {channelForm.endpoints.map((ep, i) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                          <input style={{ ...inp, flex: 1 }} value={ep} onChange={e => { const arr = [...channelForm.endpoints]; arr[i] = e.target.value; setChannelForm(p => ({ ...p, endpoints: arr })); }} placeholder="http://... or mailto:..." />
                          {i === channelForm.endpoints.length - 1 && (
                            <button onClick={() => setChannelForm(p => ({ ...p, endpoints: [...p.endpoints, ''] }))}
                              style={{ padding: '0 10px', background: 'rgba(0,212,240,.12)', border: '1px solid #00d4f0', borderRadius: '6px', color: '#00d4f0', cursor: 'pointer' }}>+</button>
                          )}
                        </div>
                      ))}
                      <div style={{ fontSize: '8px', color: '#4b6483', marginTop: '4px', lineHeight: 1.6 }}>
                        Supported URI schemes:<br />
                        http · https · tcp · mailto
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowChannelForm(false)} style={{ padding: '5px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: '6px', color: '#6b8fae', cursor: 'pointer', fontSize: '11px' }}>{t.channelCancel}</button>
                    <button onClick={addChannel} style={{ padding: '5px 14px', background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '6px', color: '#8b5cf6', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>{t.channelSave}</button>
                  </div>
                </div>
              )}

              {/* 채널 목록 */}
              {form.channels.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,.3)' }}>
                      {['Channel ID', 'Name', 'Endpoints', 'TTL', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", fontSize: '8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.channels.map((c, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                        <td style={{ padding: '6px 10px', color: '#7dd3fc' }}>{c.channelId}</td>
                        <td style={{ padding: '6px 10px', color: '#e8f4ff' }}>{c.channelName}</td>
                        <td style={{ padding: '6px 10px', color: '#6b8fae' }}>{c.endpoints.filter(Boolean).join(', ')}</td>
                        <td style={{ padding: '6px 10px', color: '#6b8fae' }}>{c.ttl}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <button onClick={() => setForm(p => ({ ...p, channels: p.channels.filter((_, j) => j !== i) }))}
                            style={{ padding: '2px 8px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '4px', color: '#ef4444', cursor: 'pointer', fontSize: '9px' }}>삭제</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', color: '#6b8fae', cursor: 'pointer', fontSize: '12px' }}>{t.clear}</button>
              <button onClick={saveProfile} style={{ padding: '7px 20px', background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', border: 'none', borderRadius: '7px', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>{t.saveSetting}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ padding: '7px 16px', background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.4)', borderRadius: '8px', color: '#8b5cf6', fontSize: '12px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' }}>
            {t.createProfile}
          </button>
        )}

        {/* 프로파일 목록 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,.4)' }}>
              {t.profHeaders.map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#6b8fae', borderBottom: '1px solid rgba(0,212,240,.18)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#6b8fae' }}>{t.noProfile}</td></tr>
            ) : paged.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,212,240,.05)' }}>
                <td style={{ padding: '8px 12px', color: '#4b6483' }}>{(page - 1) * PER + i + 1}</td>
                <td style={{ padding: '8px 12px', color: '#e8f4ff', fontWeight: '700' }}>{p.name}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{p.sosEmail}</td>
                <td style={{ padding: '8px 12px', color: '#6b8fae' }}>{p.trackEmail}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => deleteProfile(p.id)}
                    style={{ padding: '3px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', cursor: 'pointer', fontSize: '10px' }}>{t.deleteBtn}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '10px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ padding: '3px 8px', background: p === page ? '#8b5cf6' : 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: '5px', color: p === page ? '#fff' : '#8b5cf6', cursor: 'pointer', fontSize: '10px' }}>{p}</button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', background: 'transparent', color: '#6b8fae', cursor: 'pointer', fontSize: '13px' }}>{t.close}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   장비 설정 패널
══════════════════════════════════════ */
function DeviceSettingPanel({ device, onClose }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const [verData, setVerData] = useState(null); // DB에서 가져온 VER 원본
  const [original, setOriginal] = useState(null); // 원본 설정값
  const [settings, setSettings] = useState({
    mode: 'C', event: 'ON',
    timeInput: '0000', distInput: '0000',
    canUse: false, canGps: false,
    canTime: '0000', canGpsTime: '0000',
    sosUse: false, recipient: '', geoService: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '', 'saving', 'waiting', 'success', 'failed'
  const [retryCount, setRetryCount] = useState(0);
  const [callDisabled, setCallDisabled] = useState(false);
  const [callCountdown, setCallCountdown] = useState(0);
  const callCountdownRef = useRef(null);
  const MAX_RETRY = 3;

  // VER 파싱
  const parseVer = (verStr) => {
    if (!verStr) return null;
    const get = (key) => {
      const m = verStr.match(new RegExp(`${key}\\(([^)]+)\\)`));
      return m ? m[1] : null;
    };
    const verNum = verStr.split(':')[0] || '-';
    return {
      verNum,
      mode: get('Mode') || 'C',
      time: (get('Time') || '0').padStart(4, '0'),
      dist: (get('Dist') || '0').padStart(4, '0'),
      addr: get('Addr') || '',
      event: get('Event') || 'OFF',
      can: get('CAN') || '0',   // 0=off, 1=can, 2=can+gps
      canTime: (get('CAN-Time') || '0').padStart(4, '0'),
      sos: get('SOS') || 'OFF',
      gps: get('GPS') || '0',
      signal: get('SIGNAL') || '0',
    };
  };

  const gpsLabel = (v) => t.gpsLabels[v] || v;
  const signalLabel = (v) => t.signalLabels[v] || v;

  // 최신 VER 데이터 조회
  useEffect(() => {
    const fetchVer = async () => {
      try {
        const res = await api.get(`/location/${device.imei}`);
        const list = Array.isArray(res.data) ? res.data : [];
        const verItem = list.find(d => d.ver && d.ver.trim() !== '');
        if (verItem?.ver) {
          const parsed = parseVer(verItem.ver);
          parsed.regDate = verItem.regDate;
          setVerData(parsed);
          const init = {
            mode: parsed.mode,
            event: parsed.event,
            timeInput: parsed.time,
            distInput: parsed.dist,
            canUse: parsed.can === '1' || parsed.can === '2',
            canGps: parsed.can === '2',
            canTime: parsed.canTime,
            canGpsTime: parsed.canTime,
            sosUse: parsed.sos === 'ON',
            recipient: parsed.addr,
            geoService: false,
          };
          setSettings(init);
          setOriginal(init);
        }
      } catch (_) { /* 무시 */ }
    };
    fetchVer();
  }, [device.imei]);

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  // 변경된 값만 커맨드 생성
  const buildCommand = () => {
    if (!original) return null;
    const cmds = [];
    if (settings.mode !== original.mode) cmds.push(settings.mode);
    if (settings.timeInput !== original.timeInput) cmds.push(`T${settings.timeInput}`);
    if (settings.distInput !== original.distInput) cmds.push(`D${settings.distInput}`);
    if (settings.recipient !== original.recipient) {
      const r = settings.recipient.replace(/\D/g, '');
      if (r.length === 15) cmds.push(`M${r}`);
      else if (r.length === 10) cmds.push(`U${r}`);
    }
    if (settings.event !== original.event) cmds.push(settings.event === 'ON' ? 'E' : 'e');
    if (settings.sosUse !== original.sosUse) cmds.push(settings.sosUse ? 'SOS' : 'sos');
    const origCan = original.canUse ? (original.canGps ? '2' : '1') : '0';
    const newCan = settings.canUse ? (settings.canGps ? '2' : '1') : '0';
    if (newCan !== origCan) {
      if (newCan === '0') cmds.push('a');
      else if (newCan === '1') { cmds.push('A'); cmds.push(`A${settings.canTime}`); }
      else if (newCan === '2') { cmds.push('A'); cmds.push(`a${settings.canGpsTime}`); }
    } else {
      if (newCan === '1' && settings.canTime !== original.canTime) cmds.push(`A${settings.canTime}`);
      if (newCan === '2' && settings.canGpsTime !== original.canGpsTime) cmds.push(`a${settings.canGpsTime}`);
    }
    return cmds.length > 0 ? `SET=${cmds.join(',')}` : null;
  };

  const isChanged = () => {
    if (!original) return false;
    return JSON.stringify(settings) !== JSON.stringify(original);
  };

  const [saveLocked, setSaveLocked] = useState(false);
  const [callStatuses, setCallStatuses] = useState({});

  const savePollingRef = useRef(null);
  const callPollingRef = useRef(null);

  const startPolling = (idxVal, statusSetter) => {
    let count = 0;
    const timer = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(timer); statusSetter('3'); return; }
      try {
        const res = await api.get(`/location/command/status/${idxVal}`);
        const st = res.data?.status;
        if (st === '1') { statusSetter('1'); }
        if (st === '2') { clearInterval(timer); statusSetter('2'); }
        if (st === '3') { clearInterval(timer); statusSetter('3'); }
      } catch { /* 무시 */ }
    }, 5000);
    return timer;
  };

  const doSave = async () => {
    const cmd = buildCommand();
    if (!cmd) { alert(t.noChange); return; }
    setSaving(true); setSaveStatus('0');
    try {
      const res = await api.post('/location/command', { imei: device.imei, text: cmd, eventcode: '2' });
      setSaveStatus('0');
      setSaveLocked(true);
      setTimeout(() => setSaveLocked(false), 180000);
      clearInterval(savePollingRef.current);
      savePollingRef.current = startPolling(res.data?.idx, setSaveStatus);
    } catch {
      setSaveStatus('3');
    } finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (retryCount >= MAX_RETRY) { alert(t.maxRetryAlert); return; }
    await doSave();
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRY) { alert(t.maxRetryAlert2); return; }
    setRetryCount(p => p + 1);
    await doSave();
  };

  const handleCall = async (cmd) => {
    setCallDisabled(true);
    setCallStatuses(p => ({ ...p, [cmd]: '0' }));
    setCallCountdown(60);
    clearInterval(callCountdownRef.current);
    callCountdownRef.current = setInterval(() => {
      setCallCountdown(p => {
        if (p <= 1) {
          clearInterval(callCountdownRef.current);
          setCallDisabled(false);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    try {
      const res = await api.post('/location/command', { imei: device.imei, text: cmd, eventcode: '2' });
      const idxVal = res.data?.idx;
      if (idxVal) {
        clearInterval(callPollingRef.current);
        callPollingRef.current = startPolling(idxVal, (st) => {
          setCallStatuses(p => ({ ...p, [cmd]: st }));
        });
      }
    } catch {
      setCallStatuses(p => ({ ...p, [cmd]: '3' }));
    }
  };

  const toggleStyle = (on, disabled = false) => ({
    padding: '5px 16px', borderRadius: '6px',
    border: `1px solid ${on ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`,
    background: on ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
    color: on ? '#10b981' : '#ef4444',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px', fontWeight: '700', opacity: disabled ? 0.4 : 1,
  });

  const inp = {
    padding: '7px 10px', borderRadius: '6px',
    border: '1px solid rgba(0,212,240,.25)', background: 'rgba(0,0,0,.3)',
    color: '#fff', fontSize: '12px', outline: 'none',
    fontFamily: "'JetBrains Mono', monospace",
  };

  const rowStyle = { display: 'flex', alignItems: 'center', padding: '6px 14px', borderBottom: '1px solid rgba(0,212,240,.06)' };
  const lblStyle = { width: '200px', fontSize: '12px', color: '#a0b4c8', flexShrink: 0 };

  const getStatusLabel = (st) => {
    if (st === '0') return <span style={{ fontSize: '10px', color: '#f59e0b' }}>⏳ 대기</span>;
    if (st === '1') return <span style={{ fontSize: '10px', color: '#00d4f0' }}>📡 GW접수</span>;
    if (st === '2') return <span style={{ fontSize: '10px', color: '#10b981' }}>✅ 성공</span>;
    if (st === '3') return <span style={{ fontSize: '10px', color: '#ef4444' }}>❌ 실패</span>;
    return null;
  };

  const canSave = isChanged() && !saving && retryCount < MAX_RETRY && !saveLocked;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1a2d48', border: '1px solid rgba(0,212,240,.25)', borderRadius: '16px', width: '560px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* 헤더 */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '700', color: '#00d4f0' }}>DEVICE SETTINGS</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>IMEI: {device.imei} Type: {device.type}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </div>
        </div>

        {/* Firmware 버전 표시 */}
        <div title={t.tipFirmware} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(239,68,68,.05)' }}>
          <span style={{
            fontSize: '11px', fontWeight: '700', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '1px'
          }}>Firmware</span>
          < span style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
            {verData ? verData.verNum : t.verCall}
          </span>
        </div>

        {/* 설정 항목들 */}
        <div style={{ padding: '8px 0' }}>

          {/* Mode */}
          <div style={rowStyle} title={t.tipMode}>
            <span style={lblStyle}>Mode</span>
            <select value={settings.mode} onChange={e => set('mode', e.target.value)} style={{ ...inp, width: '160px' }}>
              <option value="C">CAR (C)</option>
              <option value="U">UAT (U)</option>
              <option value="T">UAV (T)</option>
            </select>
          </div>

          {/* Event */}
          <div style={rowStyle} title={t.tipEvent}>
            <span style={lblStyle}>Event</span>
            <select value={settings.event} onChange={e => set('event', e.target.value)} style={{ ...inp, width: '100px' }}>
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>

          {/* 주기 Time — 4자리 */}
          <div style={rowStyle} title={t.tipTime}>
            <span style={lblStyle}>{t.cycleTime} <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.unitMin}</span></span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={parseInt(settings.timeInput) || 0}
                onChange={e => { if (e.target.value) set('timeInput', String(e.target.value).padStart(4, '0')); }}
                style={{ ...inp, width: '90px' }}>
                <option value="0">{t.selectOption}</option>
                {[1, 5, 10, 30, 60, 120, 240].map(v => <option key={v} value={v}>{v}min</option>)}
              </select>
              <input style={{ ...inp, width: '70px', border: '1px solid rgba(16,185,129,.4)' }}
                value={parseInt(settings.timeInput) || ''}
                maxLength={4}
                placeholder="1~9999"
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (val === '') { set('timeInput', '0000'); return; }
                  const num = parseInt(val);
                  if (num < 1) return;
                  set('timeInput', val.padStart(4, '0'));
                }} />
              <span style={{ fontSize: '9px', color: '#6b8fae' }}>분</span>
            </div>
          </div>

          {/* 주기 Distance */}
          <div style={rowStyle} title={t.tipDist}>
            <span style={lblStyle}>{t.cycleDist} <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.unit10m}</span></span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={parseInt(settings.distInput) || 0}
                onChange={e => { if (e.target.value) set('distInput', String(e.target.value).padStart(4, '0')); }}
                style={{ ...inp, width: '90px' }}>
                <option value="0">{t.selectOption}</option>
                {[10, 50, 100, 500, 1000].map(v => <option key={v} value={v}>{v * 10}m</option>)}
              </select>
              <input style={{ ...inp, width: '70px', border: '1px solid rgba(16,185,129,.4)' }}
                value={parseInt(settings.distInput) || ''}
                maxLength={4}
                placeholder="1~9999"
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (val === '') { set('distInput', '0000'); return; }
                  set('distInput', val.padStart(4, '0'));
                }} />
              <span style={{ fontSize: '9px', color: '#6b8fae' }}>×10m</span>
            </div>
          </div>

          {/* CAN */}
          <div title={t.tipCan} style={{ ...rowStyle, background: 'rgba(16,185,129,.03)', border: '1px solid rgba(16,185,129,.15)', borderRadius: '6px', margin: '4px 8px' }}>
            <span style={lblStyle}>{t.canUse}</span>
            <button style={toggleStyle(settings.canUse && !settings.canGps)}
              onClick={() => {
                if (settings.canGps) return; // CAN+GPS ON이면 잠금
                const newVal = !settings.canUse;
                set('canUse', newVal);
                if (!newVal) set('canGps', false);
              }}>
              {settings.canUse && !settings.canGps ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* CAN 시간 설정 */}
          <div style={{ ...rowStyle, background: 'rgba(16,185,129,.03)', opacity: settings.canUse && !settings.canGps ? 1 : 0.35 }} title={t.tipCanTime}>
            <span style={lblStyle}>{t.canTime} <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.unitMin}</span></span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={parseInt(settings.canTime) || 0}
                disabled={!settings.canUse || settings.canGps}
                onChange={e => { if (e.target.value) set('canTime', String(e.target.value).padStart(4, '0')); }}
                style={{ ...inp, width: '90px' }}>
                <option value="0">{t.selectOption}</option>
                {[1, 5, 10, 30, 60, 120].map(v => <option key={v} value={v}>{v}min</option>)}
              </select>
              <input style={{ ...inp, width: '70px', border: `1px solid ${settings.canUse && !settings.canGps ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.25)'}` }}
                value={parseInt(settings.canTime) || ''}
                maxLength={4}
                placeholder="1~9999"
                disabled={!settings.canUse || settings.canGps}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (val === '') { set('canTime', '0000'); return; }
                  set('canTime', val.padStart(4, '0'));
                }} />
              <span style={{ fontSize: '9px', color: '#6b8fae' }}>분</span>
            </div>
          </div>

          {/* CAN+GPS 사용 여부 */}
          <div title={t.tipCanGps} style={{ ...rowStyle, border: '1px solid rgba(107,143,174,.2)', borderRadius: '6px', margin: '4px 8px' }}>
            <span style={lblStyle}>{t.canGpsUse}</span>
            <button style={toggleStyle(settings.canGps, settings.canUse && !settings.canGps)}
              onClick={() => {
                if (settings.canUse && !settings.canGps) return; // CAN ON이면 잠금
                const newVal = !settings.canGps;
                set('canGps', newVal);
                if (newVal) set('canUse', true); // CAN+GPS ON 시 canUse도 true
              }}>
              {settings.canGps ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* CAN+GPS 시간 설정 */}
          <div style={{ ...rowStyle, opacity: settings.canGps ? 1 : 0.35 }} title={t.tipCanGpsTime}>
            <span style={lblStyle}>{t.canGpsTime} <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.unitMin}</span></span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select value={parseInt(settings.canGpsTime) || 0}
                disabled={!settings.canGps}
                onChange={e => { if (e.target.value) set('canGpsTime', String(e.target.value).padStart(4, '0')); }}
                style={{ ...inp, width: '90px' }}>
                <option value="0">{t.selectOption}</option>
                {[1, 5, 10, 30, 60, 120].map(v => <option key={v} value={v}>{v}min</option>)}
              </select>
              <input style={{ ...inp, width: '70px', border: `1px solid ${settings.canGps ? 'rgba(239,68,68,.5)' : 'rgba(0,212,240,.25)'}` }}
                value={parseInt(settings.canGpsTime) || ''}
                maxLength={4}
                placeholder="1~9999"
                disabled={!settings.canGps}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (val === '') { set('canGpsTime', '0000'); return; }
                  set('canGpsTime', val.padStart(4, '0'));
                }} />
              <span style={{ fontSize: '9px', color: '#6b8fae' }}>분</span>
            </div>
          </div>

          {/* SOS 사용 여부 */}
          <div style={rowStyle} title={t.tipSos}>
            <span style={lblStyle}>{t.sosUse}</span>
            <button style={toggleStyle(settings.sosUse)} onClick={() => set('sosUse', !settings.sosUse)}>
              {settings.sosUse ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* 수신처 */}
          <div style={rowStyle} title={t.tipAddr}>
            <span style={lblStyle}>{t.recipient} <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.recipientUnit}</span></span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <input style={{ ...inp, width: '280px' }} value={settings.recipient}
                onChange={e => set('recipient', e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder={t.recipientPh} />
              {settings.recipient && settings.recipient.length !== 10 && settings.recipient.length !== 15 && (
                <span style={{ fontSize: '9px', color: '#ef4444' }}>{t.recipientErr}</span>
              )}
              {settings.recipient && (settings.recipient.length === 10 || settings.recipient.length === 15) && (
                <span style={{ fontSize: '9px', color: '#10b981' }}>
                  {settings.recipient.length === 15 ? t.recipientImei : t.recipientUnit2}
                </span>
              )}
            </div>
          </div>

          {/* GEO Service */}
          <div style={rowStyle}>
            <span style={lblStyle}>GEO Service</span>
            <button style={toggleStyle(settings.geoService)} onClick={() => set('geoService', !settings.geoService)}>
              {settings.geoService ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* GPS 표시 — 읽기전용 */}
          <div style={{ ...rowStyle, background: 'rgba(245,158,11,.04)' }}>
            <span style={{ ...lblStyle, color: '#fbbf24', fontWeight: '700' }}>GPS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
                {verData ? verData.gps : '—'}
              </span>
              <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                {verData ? gpsLabel(verData.gps) : ''}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{ width: '6px', height: `${8 + i * 4}px`, borderRadius: '2px', background: verData && parseInt(verData.gps) > i ? '#fbbf24' : 'rgba(255,255,255,.1)', alignSelf: 'flex-end' }} />
                ))}
              </div>
            </div>
          </div>

          {/* SIGNAL 표시 — 읽기전용 */}
          <div style={{ ...rowStyle, background: 'rgba(16,185,129,.04)' }}>
            <span style={{ ...lblStyle, color: '#10b981', fontWeight: '700' }}>SIGNAL</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', fontFamily: "'JetBrains Mono', monospace" }}>
                {verData ? verData.signal : '—'}
              </span>
              <span style={{ fontSize: '11px', color: '#10b981' }}>
                {verData ? signalLabel(verData.signal) : ''}
              </span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ width: '6px', height: `${6 + i * 4}px`, borderRadius: '2px', background: verData && parseInt(verData.signal) > i ? '#10b981' : 'rgba(255,255,255,.1)', alignSelf: 'flex-end' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 마지막 설정 시간 — status=2(성공)일 때만 표시 */}
        <div style={{ margin: '0 14px 4px', padding: '6px 12px', background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10px', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace" }}>마지막 설정시간 :</span>
          <span style={{ fontSize: '10px', color: '#fbbf24', fontFamily: "'JetBrains Mono', monospace" }}>
            {verData && saveStatus === '2'
              ? `${verData.regDate?.slice(0, 4)}-${verData.regDate?.slice(4, 6)}-${verData.regDate?.slice(6, 8)} ${verData.regDate?.slice(8, 10)}:${verData.regDate?.slice(10, 12)}`
              : verData
                ? `${verData.regDate?.slice(0, 4)}-${verData.regDate?.slice(4, 6)}-${verData.regDate?.slice(6, 8)} ${verData.regDate?.slice(8, 10)}:${verData.regDate?.slice(10, 12)} (이전 설정)`
                : '— VER-Call 후 표시됩니다.'}
          </span>
        </div>
        {isChanged() && buildCommand() && (
          <div style={{ margin: '0 14px 8px', padding: '8px 12px', background: 'rgba(0,212,240,.05)', border: '1px solid rgba(0,212,240,.15)', borderRadius: '8px' }}>
            <span style={{ fontSize: '9px', color: '#6b8fae' }}>{t.sendCmd}</span>
            <span style={{ fontSize: '10px', color: '#00d4f0', fontFamily: "'JetBrains Mono', monospace" }}>{buildCommand()}</span>
          </div>
        )}

        {/* 저장 버튼 */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,212,240,.1)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleSave} disabled={!canSave}
            style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', background: canSave ? 'linear-gradient(135deg,#00d4f0,#0891b2)' : 'rgba(255,255,255,.07)', color: canSave ? '#0d1628' : 'rgba(255,255,255,.2)', fontWeight: '700', fontSize: '12px', cursor: canSave ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
            {t.saveAll}
          </button>
          <span style={{ fontSize: '10px', color: '#6b8fae' }}>{t.ackNote}</span>

          {saveStatus && getStatusLabel(saveStatus)}
        </div>

        {/* Device Call */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,212,240,.1)' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {t.deviceCall}
            <span style={{ fontSize: '9px', color: '#6b8fae', fontWeight: '400' }}>{t.callNote}</span>
            {callCountdown > 0 && (
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#ef4444', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '6px', padding: '2px 10px' }}>
                🔒 {callCountdown}s
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'CAN-Call', cmd: 'SET=CAN', desc: 'CAN데이터 호출', highlight: false },
              { label: 'can-Call', cmd: 'SET=can', desc: 'CAN+위치 데이터 호출', highlight: false },
              { label: '위치호출', cmd: 'SET=UAT', desc: '위치호출 데이터 호출', highlight: false },
              { label: 'VER-Call', cmd: 'SET=VER', desc: 'VER 호출', highlight: true },
            ].map(b => {
              const cs = callStatuses[b.cmd] || '';
              return (
                <div key={b.cmd} style={{ textAlign: 'center' }}>
                  <button onClick={() => handleCall(b.cmd)} disabled={callDisabled}
                    style={{ padding: '6px 14px', borderRadius: '7px', border: `1px solid ${b.highlight ? 'rgba(0,212,240,.5)' : 'rgba(255,255,255,.15)'}`, background: b.highlight ? 'rgba(0,212,240,.12)' : 'rgba(255,255,255,.05)', color: b.highlight ? '#00d4f0' : '#e8f4ff', cursor: callDisabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700', opacity: callDisabled ? 0.4 : 1 }}>
                    {b.label}
                  </button>
                  <div style={{ fontSize: '8px', color: '#4b6483', marginTop: '2px' }}>{b.desc}</div>
                  {cs && <div style={{ marginTop: '2px' }}>{getStatusLabel(cs)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div >
  );
}

/* ══════════════════════════════════════
   GEO Fence 패널
══════════════════════════════════════ */
function GeoFencePanel({ devices, selectedDevice, onClose }) {
  const t = DEV_T[getLang()] || DEV_T.ko;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const drawSourceRef = useRef(null);
  const vectorLayerRef = useRef(null);
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState('DEF1');
  const [geoOn, setGeoOn] = useState(true);
  const [interval, setIntervalVal] = useState('S010');
  const [intervalT, setIntervalT] = useState('T010');
  const [activeGeo, setActiveGeo] = useState(null);
  const deviceKey = `geo_${selectedDevice?.imei || 'unknown'}`;

  const [savedSlots, setSavedSlots] = useState(() => {
    try {
      const saved = localStorage.getItem(`${deviceKey}_slots`);
      return saved ? JSON.parse(saved) : { 'GEO-1': null, 'GEO-2': null, 'GEO-3': null, 'GEO-4': null, 'GEO-5': null };
    } catch (_) {
      return { 'GEO-1': null, 'GEO-2': null, 'GEO-3': null, 'GEO-4': null, 'GEO-5': null };
    }
  });

  const [lastSentSlot, setLastSentSlot] = useState(() => {
    return localStorage.getItem(`${deviceKey}_lastSent`) || null;
  });
  const [sendStatus, setSendStatus] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [sendLocked, setSendLocked] = useState(false);
  const geoPollingRef = useRef(null);

  const startGeoPolling = (idxVal) => {
    let count = 0;
    const timer = setInterval(async () => {
      count++;
      if (count > 60) { clearInterval(timer); setSendStatus('3'); return; }
      try {
        const res = await api.get(`/location/command/status/${idxVal}`);
        const st = res.data?.status;
        if (st === '1') setSendStatus('1');
        if (st === '2') {
          clearInterval(timer);
          setSendStatus('2');
          // 성공시에만 lastSentSlot 업데이트 → 노란색 표시
          setLastSentSlot(activeGeo);
          localStorage.setItem(`${deviceKey}_lastSent`, activeGeo);
        }
        if (st === '3') { clearInterval(timer); setSendStatus('3'); }
      } catch { /* 무시 */ }
    }, 5000);
    return timer;
  };
  const [intersectError, setIntersectError] = useState(false);
  const MAX_RETRY = 3;
  const MAX_POINTS = 8;


  // 선분 교차 검사
  const ccw = (A, B, C) => (C.lat - A.lat) * (B.lon - A.lon) > (B.lat - A.lat) * (C.lon - A.lon);
  const segmentsIntersect = (A, B, C, D) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
  const hasIntersection = (pts) => {
    const n = pts.length;
    if (n < 4) return false;

    // 모든 선분 목록 (열린 폴리라인 + 닫히는 선분)
    const edges = [];
    for (let i = 0; i < n - 1; i++) {
      edges.push([pts[i], pts[i + 1]]);
    }
    // 닫히는 선분: 마지막→첫번째
    edges.push([pts[n - 1], pts[0]]);

    // 모든 비인접 선분 쌍 교차 검사
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 2; j < edges.length; j++) {
        // 첫번째와 마지막 선분은 꼭짓점을 공유하므로 제외
        if (i === 0 && j === edges.length - 1) continue;
        if (segmentsIntersect(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) {
          return true;
        }
      }
    }
    return false;
  };

  // OpenLayers 초기화
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const source = new VectorSource();
    drawSourceRef.current = source;

    const vectorLayer = new VectorLayer({ source });
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        vectorLayer,
      ],
      view: new View({ center: fromLonLat([127.5, 36.5]), zoom: 7 }),
    });
    mapInstanceRef.current = map;

    // 현재 위치
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.getView().setCenter(fromLonLat([pos.coords.longitude, pos.coords.latitude]));
          map.getView().setZoom(13);
        },
        () => {
          map.getView().setCenter(fromLonLat([127.5, 36.5]));
          map.getView().setZoom(7);
        }
      );
    }

    // 클릭으로 꼭짓점 추가
    map.on('click', (e) => {
      const [lon, lat] = toLonLat(e.coordinate);
      const newPt = { lat: parseFloat(lat.toFixed(6)), lon: parseFloat(lon.toFixed(6)) };
      setPoints(prev => {
        if (prev.length >= MAX_POINTS) return prev;
        const next = [...prev, newPt];
        if (next.length >= 4 && hasIntersection(next)) {
          setIntersectError(true);
          setTimeout(() => setIntersectError(false), 2000);
          return prev;
        }
        setIntersectError(false);
        return next;
      });
    });

    return () => { map.setTarget(undefined); mapInstanceRef.current = null; };
  }, []);

  // points 변경 시 지도 업데이트
  useEffect(() => {
    const source = drawSourceRef.current;
    if (!source) return;
    source.clear();

    const color = mode === 'DEF1' ? '#10b981' : mode === 'DEF2' ? '#ef4444' : '#3b82f6';

    if (points.length >= 3) {
      const coords = points.map(p => fromLonLat([p.lon, p.lat]));
      const polygon = new Feature({ geometry: new Polygon([[...coords, coords[0]]]) });
      polygon.setStyle(new Style({
        stroke: new Stroke({ color, width: 2 }),
        fill: new Fill({ color: color + '33' }),
      }));
      source.addFeature(polygon);
    }

    if (points.length >= 2) {
      const coords = points.map(p => fromLonLat([p.lon, p.lat]));
      const line = new Feature({ geometry: new LineString(coords) });
      line.setStyle(new Style({
        stroke: new Stroke({ color, width: 1.5, lineDash: [4, 4] }),
      }));
      source.addFeature(line);
    }

    points.forEach((p, i) => {
      const f = new Feature({ geometry: new Point(fromLonLat([p.lon, p.lat])) });
      f.setStyle(new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
        }),
        text: new Text({
          text: `${i + 1}`,
          fill: new Fill({ color: '#fff' }),
          font: 'bold 10px sans-serif',
          offsetY: -18,
        }),
      }));
      source.addFeature(f);
    });
  }, [points, mode]);

  const buildCommand = () => {
    if (!geoOn || points.length < 3) return null;
    const n = points.length;
    const coords = points.map((p, i) => `${n}-${i + 1},${p.lat},${p.lon}`).join(',');
    const intervalStr = mode === 'DEF1' ? interval : mode === 'DEF2' ? intervalT : `${interval},${intervalT}`;
    return `G1,${mode},${intervalStr},${n},${coords}`;
  };

  const handleSaveSlot = async () => {
    if (!activeGeo) { alert(t.geoSlotSelect); return; }
    if (points.length < 3) { alert(t.geoMinPts); return; }

    const cmd = buildCommand();
    if (!cmd) { alert('커맨드 생성 실패'); return; }

    try {
      await api.post('/location/command/geo', {
        imei: selectedDevice?.imei,
        slotName: activeGeo,
        command: cmd,
      });
      const newSlots = { ...savedSlots, [activeGeo]: { points: [...points], mode, interval, intervalT } };
      setSavedSlots(newSlots);
      localStorage.setItem(`${deviceKey}_slots`, JSON.stringify(newSlots));
      alert(t.geoSaved(activeGeo));
    } catch (_) {
      alert(t.geoSaveFail);
    }
  };

  const doSend = async () => {
    if (!activeGeo || !savedSlots[activeGeo]) { alert('먼저 슬롯을 저장해주세요.'); return; }
    const cmd = savedSlots[activeGeo] ? buildCommand() : null;
    if (!cmd) { alert('최소 3개 좌표가 필요합니다.'); return; }
    setSendStatus('0');
    try {
      const res = await api.post('/location/command', {
        imei: selectedDevice?.imei,
        text: cmd,
        eventcode: '3',
        title: activeGeo,
      });
      setSendLocked(true);
      setTimeout(() => setSendLocked(false), 120000);
      clearInterval(geoPollingRef.current);
      geoPollingRef.current = startGeoPolling(res.data?.idx);
    } catch {
      setSendStatus('3');
    }
  };

  const handleSend = async () => {
    if (sendLocked) { alert(t.geoLockAlert); return; }
    if (!activeGeo) { alert(t.geoSlotSelect); return; }
    setRetryCount(0);
    await doSend();
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRY) { alert(t.geoMaxRetryAlert); return; }
    setRetryCount(p => p + 1);
    await doSend();
  };

  const intervalLabel = (v) => {
    const n = parseInt(v.slice(1));
    if (n < 60) return `${n}${t.min}`;
    if (n === 60) return `1${t.hour}`;
    if (n === 120) return `2${t.hour}`;
    if (n === 240) return `4${t.hour}`;
    if (n === 480) return `8${t.hour}`;
    if (n === 960) return `16${t.hour}`;
    if (n === 1440) return `24${t.hour}`;
    return `${n}${t.min}`;
  };
  const INTERVAL_OPTIONS = ['S001', 'S005', 'S010', 'S030', 'S060', 'S120', 'S240', 'S480', 'S960', 'S1440'].map(v => ({ value: v, label: `${v} — ${intervalLabel(v)}` }));
  const INTERVAL_T_OPTIONS = ['T001', 'T005', 'T010', 'T030', 'T060', 'T120', 'T240', 'T480', 'T960', 'T1440'].map(v => ({ value: v, label: `${v} — ${intervalLabel(v)}` }));

  // lastSentSlot은 status=2(성공)시에만 설정됨
  const slotBorder = (g) => {
    if (g === lastSentSlot) return '2px solid #fbbf24'; // 성공 → 노란색
    if (savedSlots[g]) return '2px solid #ef4444';     // 저장됨 → 빨간색
    return '1px solid rgba(0,212,240,.2)';              // 빈 슬롯
  };
  const slotBg = (g) => {
    if (g === activeGeo) return 'rgba(0,212,240,.15)';
    if (g === lastSentSlot) return 'rgba(245,158,11,.1)';
    if (savedSlots[g]) return 'rgba(239,68,68,.08)';
    return 'rgba(0,0,0,.3)';
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#0d1628', border: '1px solid rgba(0,212,240,.25)', borderRadius: '12px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* 헤더 */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,212,240,.2)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: geoOn ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: geoOn ? '0 0 6px #10b981' : '0 0 6px #ef4444' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: '700', color: '#00d4f0' }}>{t.geoTitle}</span>

          {/* G1 ON / G2 OFF */}
          <div style={{ position: 'relative', display: 'inline-block' }} className="geo-tooltip-wrap">
            <button onClick={() => setGeoOn(true)} title={t.ttG1on}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: geoOn ? '#10b981' : 'rgba(16,185,129,.15)', color: geoOn ? '#fff' : '#10b981', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              G1 ON
            </button>
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button onClick={() => setGeoOn(false)} title={t.ttG2off}
              style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', background: !geoOn ? '#ef4444' : 'rgba(239,68,68,.15)', color: !geoOn ? '#fff' : '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
              G2 OFF
            </button>
          </div>

          <span style={{ color: '#4b6483', fontSize: '10px' }}>MODE</span>
          {[
            { key: 'DEF1', label: 'DEF1 IN', tooltip: t.ttDef1, color: '#10b981' },
            { key: 'DEF2', label: 'DEF2 OUT', tooltip: t.ttDef2, color: '#ef4444' },
            { key: 'DEF3', label: 'DEF3 BOTH', tooltip: t.ttDef3, color: '#3b82f6' },
          ].map(m => (
            <button key={m.key} onClick={() => setMode(m.key)} title={m.tooltip}
              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: mode === m.key ? m.color : 'rgba(255,255,255,.07)', color: mode === m.key ? '#fff' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}

          <span style={{ color: '#4b6483', fontSize: '10px' }}>INTERVAL</span>
          {(mode === 'DEF1' || mode === 'DEF3') && (
            <select value={interval} onChange={e => setIntervalVal(e.target.value)}
              title={t.ttIntervalS}
              style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', outline: 'none', cursor: 'pointer' }}>
              {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {(mode === 'DEF2' || mode === 'DEF3') && (
            <select value={intervalT} onChange={e => setIntervalT(e.target.value)}
              title={t.ttIntervalT}
              style={{ padding: '3px 8px', background: '#1a2d48', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', color: '#00d4f0', fontSize: '10px', outline: 'none', cursor: 'pointer' }}>
              {INTERVAL_T_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: '#6b8fae' }}>{t.geoDevice} {selectedDevice?.alias || '—'}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b8fae', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
        </div>

        {/* 교차 오류 */}
        {intersectError && (
          <div style={{ padding: '6px 20px', background: 'rgba(239,68,68,.15)', borderBottom: '1px solid rgba(239,68,68,.3)', fontSize: '11px', color: '#ef4444', fontWeight: '700', flexShrink: 0 }}>
            {t.geoIntersect}
          </div>
        )}

        {/* 본문 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* 지도 영역 */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'rgba(0,0,0,.3)' }}>
              <span style={{ fontSize: '10px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace" }}>
                DRAWING AREA {points.length} / {MAX_POINTS} pts
              </span>
              <span style={{ fontSize: '9px', color: '#4b6483' }}>{t.geoDrawNote(MAX_POINTS)}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                <button onClick={() => setPoints(p => p.slice(0, -1))}
                  style={{ padding: '3px 10px', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: '5px', color: '#f59e0b', fontSize: '10px', cursor: 'pointer' }}>↩ Undo</button>
                <button onClick={() => setPoints([])}
                  style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>✕ Clear</button>
              </div>
            </div>
            <div ref={mapRef} style={{ flex: 1, cursor: 'crosshair' }} />
          </div>

          {/* 우측 패널 */}
          <div style={{ width: '300px', borderLeft: '1px solid rgba(0,212,240,.1)', display: 'flex', flexDirection: 'column', gap: '0', overflowY: 'auto', background: '#0a1628' }}>

            {/* 좌표 목록 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>{t.geoCoordList}</div>
              {points.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#4b6483', textAlign: 'center', padding: '10px' }}>{t.geoClickNote}</div>
              ) : points.map((p, i) => (
                <div key={i} style={{ fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", padding: '3px 0', borderBottom: '1px solid rgba(0,212,240,.05)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#00d4f0' }}>{i + 1}.</span>
                  <span>{p.lat.toFixed(5)}, {p.lon.toFixed(5)}</span>
                </div>
              ))}
            </div>

            {/* GEO 슬롯 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>{t.geoSlot}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['GEO-1', 'GEO-2', 'GEO-3', 'GEO-4', 'GEO-5'].map(g => (
                  <button key={g} onClick={() => {
                    setActiveGeo(activeGeo === g ? null : g);
                    if (savedSlots[g]) {
                      setPoints(savedSlots[g].points);
                      setMode(savedSlots[g].mode || 'DEF1');
                    } else {
                      setPoints([]); // 빈 슬롯 클릭시 지도 초기화
                    }
                  }}
                    style={{ padding: '5px 10px', borderRadius: '6px', border: slotBorder(g), background: slotBg(g), color: activeGeo === g ? '#00d4f0' : savedSlots[g] ? '#ef4444' : '#6b8fae', fontSize: '10px', fontWeight: '700', cursor: 'pointer' }}>
                    {g}
                  </button>
                ))}
              </div>
              {lastSentSlot && (
                <div style={{ fontSize: '9px', color: '#fbbf24', padding: '4px 8px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '5px' }}>
                  {t.geoLastSent} {lastSentSlot}
                </div>
              )}
              {activeGeo && savedSlots[activeGeo] && (
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#10b981', padding: '4px 8px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: '5px' }}>
                  {t.geoSavedSlot(savedSlots[activeGeo].points.length, savedSlots[activeGeo].mode)}
                </div>
              )}
            </div>

            {/* Command Preview */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              <div style={{ fontSize: '10px', color: '#00d4f0', fontWeight: '700', marginBottom: '8px', letterSpacing: '1px' }}>{t.geoCmdPreview}</div>
              <div style={{ background: 'rgba(0,0,0,.4)', border: '1px solid rgba(0,212,240,.15)', borderRadius: '6px', padding: '10px', fontSize: '9px', color: '#6b8fae', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, minHeight: '60px', wordBreak: 'break-all' }}>
                {buildCommand() || t.geoCmdNote}
              </div>
            </div>

            {/* 안내 문구 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)', fontSize: '10px', color: '#6b8fae', lineHeight: 1.8 }}>
              <div style={{ fontWeight: '700', color: '#00d4f0', marginBottom: '6px', fontSize: '11px' }}>{t.geoGuideTitle}</div>
              <div>{t.geoGuide1}</div>
              <div>{t.geoGuide2[0]}<span style={{ color: '#00d4f0', fontWeight: '700' }}>{t.geoGuide2[1]}</span>{t.geoGuide2[2]}<span style={{ color: '#ef4444', fontWeight: '700' }}>{t.geoGuide2[3]}</span>{t.geoGuide2[4]}</div>
              <div>{t.geoGuide3}</div>
              <div>{t.geoGuide4[0]}<span style={{ color: '#00d4f0', fontWeight: '700' }}>{t.geoGuide4[1]}</span>{t.geoGuide4[2]}<span style={{ color: '#fbbf24', fontWeight: '700' }}>{t.geoGuide4[3]}</span>{t.geoGuide4[4]}</div>
              <div style={{ marginTop: '6px', fontSize: '9px', color: '#4b6483', lineHeight: 1.8 }}>
                {t.geoGuide5}
              </div>
              <div style={{ marginTop: '8px', padding: '8px 10px', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '6px', fontSize: '9px', color: '#fbbf24', lineHeight: 1.8 }}>
                {t.geoGuide6}
              </div>
            </div>

            {/* 전송 상태 */}
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(0,212,240,.08)' }}>
              {sendStatus === '0' && (
                <div style={{ padding: '8px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '6px', fontSize: '10px', color: '#f59e0b' }}>
                  ⏳ 대기 중...
                </div>
              )}
              {sendStatus === '1' && (
                <div style={{ padding: '8px', background: 'rgba(0,212,240,.08)', border: '1px solid rgba(0,212,240,.2)', borderRadius: '6px', fontSize: '10px', color: '#00d4f0' }}>
                  📡 GW 접수 성공
                </div>
              )}
              {sendStatus === '2' && (
                <div style={{ padding: '8px', background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: '6px', fontSize: '10px', color: '#10b981' }}>
                  ✅ 전송 성공
                </div>
              )}
              {sendStatus === '3' && retryCount < MAX_RETRY && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', fontSize: '10px', color: '#ef4444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>❌ 실패 ({retryCount}/{MAX_RETRY})</span>
                  <button onClick={handleRetry} style={{ padding: '3px 10px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '5px', color: '#ef4444', fontSize: '10px', cursor: 'pointer' }}>{t.geoRetry}</button>
                </div>
              )}
              {sendStatus === '3' && retryCount >= MAX_RETRY && (
                <div style={{ padding: '8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', fontSize: '10px', color: '#ef4444' }}>
                  ❌ 최대 재시도 초과 ({MAX_RETRY}회)
                </div>
              )}
              {sendLocked && sendStatus !== '0' && (
                <div style={{ marginTop: '6px', fontSize: '9px', color: '#6b8fae' }}>{t.geoLocked}</div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ padding: '14px', display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <button onClick={handleSaveSlot}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,212,240,.3)', background: 'rgba(0,212,240,.1)', color: '#00d4f0', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                {t.geoSaveBtn}
              </button>
              {(() => {
                const canSend = !sendLocked && retryCount < MAX_RETRY && activeGeo && savedSlots[activeGeo];
                return (
                  <button onClick={handleSend} disabled={!canSend}
                    title={!activeGeo ? '슬롯을 선택하세요' : !savedSlots[activeGeo] ? '먼저 저장해주세요' : ''}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: canSend ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,.07)', color: canSend ? '#fff' : 'rgba(255,255,255,.2)', fontWeight: '700', fontSize: '12px', cursor: canSend ? 'pointer' : 'not-allowed' }}>
                    {t.geoSendBtn}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}