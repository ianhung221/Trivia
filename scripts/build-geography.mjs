import fs from 'node:fs';
import crypto from 'node:crypto';

// Source snapshots are retained for reproducibility; no network is needed to rebuild.
const countries = JSON.parse(fs.readFileSync(new URL('./research/countries.json', import.meta.url), 'utf8'));
const regionNames = new Intl.DisplayNames('zh-Hant', { type: 'region' });
const currencyNames = new Intl.DisplayNames('zh-Hant', { type: 'currency' });
const languageNames = new Intl.DisplayNames('zh-Hant', { type: 'language' });
const names = { HK:'香港', MO:'澳門', PS:'巴勒斯坦', CD:'剛果民主共和國', CG:'剛果共和國', GB:'英國', US:'美國', TW:'台灣', KR:'韓國', KP:'北韓', CI:'象牙海岸', CV:'維德角', SZ:'史瓦帝尼', TL:'東帝汶' };
const name = c => names[c.cca2] || regionNames.of(c.cca2);
const by3 = Object.fromEntries(countries.map(c => [c.cca3, c]));
const by2 = Object.fromEntries(countries.map(c => [c.cca2, c]));
const day = '2026-11-09';
const questions = [];
const extraAliases = { GB:['英國','聯合王國','United Kingdom','UK'], US:['美國','美利堅合眾國','USA','United States'], TW:['台灣','臺灣','Taiwan'], KR:['韓國','南韓','大韓民國','South Korea'], KP:['北韓','朝鮮','North Korea'], CN:['中國','中華人民共和國','China'], CZ:['捷克','捷克共和國','Czechia','Czech Republic'], AE:['阿聯酋','阿拉伯聯合大公國','UAE'], CD:['剛果民主共和國','民主剛果','剛果金'], CG:['剛果共和國','剛果布'], NZ:['紐西蘭','新西蘭'], AU:['澳洲','澳大利亞'], SA:['沙烏地阿拉伯','沙烏地','沙特阿拉伯'], VN:['越南'], CI:['象牙海岸','科特迪瓦'], SZ:['史瓦帝尼','Eswatini'], MM:['緬甸','Myanmar','Burma'], TR:['土耳其','Türkiye','Turkey'] };
const aliases = c => [...new Set([name(c), c.name.common, c.name.official, ...(extraAliases[c.cca2] || [])])];
const regions = { Asia:'亞洲', Europe:'歐洲', Africa:'非洲', Americas:'美洲', Oceania:'大洋洲', Antarctic:'南極洲' };
const subregions = {'Eastern Asia':'東亞','South-Eastern Asia':'東南亞','Southern Asia':'南亞','Central Asia':'中亞','Western Asia':'西亞','Northern Europe':'北歐','Southern Europe':'南歐','Western Europe':'西歐','Eastern Europe':'東歐','Northern Africa':'北非','Western Africa':'西非','Middle Africa':'中非','Eastern Africa':'東非','Southern Africa':'南部非洲','Northern America':'北美洲北部','Central America':'中美洲','South America':'南美洲','Caribbean':'加勒比地區','Australia and New Zealand':'澳洲與紐西蘭','Melanesia':'美拉尼西亞','Micronesia':'密克羅尼西亞','Polynesia':'玻里尼西亞'};
function add(family, category, type, prompt, answer, explanation, sourceIds=['countries'], answerAliases=[], options=[]) {
  questions.push({ id:`geo-${String(questions.length+1).padStart(4,'0')}`, family, category, type, prompt, answer, aliases:[...new Set([answer,...answerAliases])], options, explanation, sourceIds, checkedAt:day });
}
function take(items, n, family) { if(items.length<n) throw Error(`${family}: only ${items.length}/${n}`); return items.slice(0,n); }
// Spread selection across the world rather than selecting only alphabetically early countries.
function spread(items) { return [...items].sort((a,b)=>crypto.createHash('sha256').update(a.cca2||a.ident).digest('hex').localeCompare(crypto.createHash('sha256').update(b.cca2||b.ident).digest('hex'))); }
const capitals = {
AF:'喀布爾',AO:'羅安達',AL:'地拉那',AD:'安道爾城',AE:'阿布達比',AR:'布宜諾斯艾利斯',AM:'葉里溫',AU:'坎培拉',AT:'維也納',AZ:'巴庫',BE:'布魯塞爾',BD:'達卡',BG:'索菲亞',BH:'麥納瑪',BS:'拿索',BA:'塞拉耶佛',BY:'明斯克',BZ:'貝爾莫潘',BR:'巴西利亞',BB:'布里奇敦',BN:'斯里巴加灣市',BT:'廷布',BW:'嘉柏隆里',CA:'渥太華',CL:'聖地牙哥',CN:'北京',CM:'雅溫德',CD:'金夏沙',CG:'布拉薩',CO:'波哥大',CR:'聖荷西',CU:'哈瓦那',CY:'尼古西亞',CZ:'布拉格',DE:'柏林',DK:'哥本哈根',DO:'聖多明哥',DZ:'阿爾及爾',EC:'基多',EG:'開羅',ES:'馬德里',EE:'塔林',FI:'赫爾辛基',FJ:'蘇瓦',FR:'巴黎',GB:'倫敦',GE:'提比里斯',GH:'阿克拉',GR:'雅典',GT:'瓜地馬拉市',GY:'喬治敦',HN:'德古西加巴',HR:'札格雷布',HU:'布達佩斯',IN:'新德里',IE:'都柏林',IR:'德黑蘭',IQ:'巴格達',IS:'雷克雅維克',IT:'羅馬',JM:'京斯敦',JO:'安曼',JP:'東京',KE:'奈洛比',KG:'比什凱克',KH:'金邊',KR:'首爾',KW:'科威特市',LA:'永珍',LB:'貝魯特',LI:'瓦杜茲',LT:'維爾紐斯',LU:'盧森堡市',LV:'里加',MA:'拉巴特',MD:'基希訥烏',MG:'安塔那那利佛',MV:'馬累',MX:'墨西哥城',MK:'史高比耶',MT:'瓦萊塔',MM:'奈比多',ME:'波德戈里察',MN:'烏蘭巴托',MZ:'馬布多',MU:'路易港',NA:'溫荷克',NG:'阿布賈',NI:'馬納瓜',NO:'奧斯陸',NP:'加德滿都',NZ:'威靈頓',OM:'馬斯喀特',PK:'伊斯蘭馬巴德',PA:'巴拿馬市',PE:'利馬',PH:'馬尼拉',PL:'華沙',PT:'里斯本',PY:'亞松森',QA:'杜哈',RO:'布加勒斯特',RU:'莫斯科',RW:'吉佳利',SA:'利雅德',SN:'達卡',SK:'布拉提斯拉瓦',SI:'盧比安納',SE:'斯德哥爾摩',TH:'曼谷',TJ:'杜尚別',TN:'突尼斯市',TR:'安卡拉',TW:'台北',TZ:'多多馬',UG:'坎帕拉',UA:'基輔',UY:'蒙特維多',US:'華盛頓特區',UZ:'塔什干',VE:'卡拉卡斯',VN:'河內',ZM:'路沙卡',ZW:'哈拉雷'
};
const capitalAliases = {AU:['堪培拉','Canberra'],TW:['臺北','台北市','臺北市','Taipei'],US:['華盛頓','Washington','Washington DC','Washington D.C.'],KR:['漢城','Seoul'],AE:['阿布扎比'],AR:['布宜諾斯艾利斯','布宜諾斯愛利斯'],AM:['埃里溫'],BA:['薩拉熱窩'],BZ:['貝爾莫盤'],CL:['聖地亞哥'],CG:['布拉柴維爾'],CR:['聖何塞'],CY:['尼科西亞'],GE:['第比利斯'],HN:['特古西加爾巴'],HR:['薩格勒布'],JM:['金斯敦'],KE:['內羅畢'],LA:['萬象'],MD:['奇西瑙'],MG:['塔那那利佛'],MK:['斯科普里'],MV:['馬列'],MT:['瓦萊塔','瓦勒他'],MZ:['馬普托'],NA:['溫得和克'],NZ:['惠靈頓'],QA:['多哈'],RW:['基加利'],SK:['布拉迪斯拉發'],SI:['盧布爾雅那'],TN:['突尼斯'],TZ:['多多瑪'],UA:['基輔','Kyiv','Kiev'],UY:['蒙得維的亞'],ZM:['盧薩卡']};
for (const c of take(spread(countries.filter(c=>capitals[c.cca2]&&!['EG','ID','GQ'].includes(c.cca2))),100,'capitals')) {
  add('capital','國家與文化','fill',`如果要拜訪${name(c)}的首都，目的地是哪座城市？`,capitals[c.cca2],`${capitals[c.cca2]}（${c.capital[0]}）是${name(c)}的首都。${name(c)}位於${subregions[c.subregion]||regions[c.region]}；首都指政治中心，不一定是最大城市或最繁忙的航空門戶。`,['countries'],[c.capital[0],...(capitalAliases[c.cca2]||[])]);
}
const currencyCount = {};
const currencyCandidates = spread(countries.filter(c=>Object.keys(c.currencies).length===1&&!['ZW','BG','PS','CU','VE','SS','SD','GS','IO'].includes(c.cca2))).filter(c=> {const k=Object.keys(c.currencies)[0];currencyCount[k]=(currencyCount[k]||0)+1;return currencyCount[k]<=2;});
const currencyAlias = {USD:['美元','美金','US dollar'],EUR:['歐元','Euro'],GBP:['英鎊','Pound sterling'],JPY:['日圓','日元','Japanese yen'],TWD:['新台幣','新臺幣','台幣','臺幣'],CNY:['人民幣','人民幣元','人民幣圓'],KRW:['韓元','韓圓'],AUD:['澳元','澳幣','澳洲元'],NZD:['紐西蘭元','紐幣'],SGD:['新加坡元','新幣','星幣'],CHF:['瑞士法郎','瑞郎'],THB:['泰銖'],VND:['越南盾','越南同'],MYR:['馬來西亞令吉','令吉','馬幣'],IDR:['印尼盾','印尼盧比'],CAD:['加拿大元','加元','加幣'],HKD:['港元','港幣'],MOP:['澳門元','澳門幣','澳門圓'],RUB:['俄羅斯盧布','盧布'],INR:['印度盧比']};
for(const c of take(currencyCandidates,80,'currencies')) {
 const code=Object.keys(c.currencies)[0], cur=c.currencies[code], zh=({XCD:'東加勒比元',XOF:'西非 CFA 法郎',XAF:'中非 CFA 法郎',RSD:'塞爾維亞第納爾',AWG:'阿魯巴弗羅林'})[code]||currencyNames.of(code);
 const short=zh.replace(new RegExp(`^${name(c)}`),'');
 add('currency','國家與文化','fill',`到${name(c)}旅行，標示「${code}」的價格使用哪種貨幣？`,zh,`${code} 是${zh}的三字母貨幣代碼（英文 ${cur.name}）。貨幣代碼比單看「${cur.symbol||'$'}」等符號更明確，因為相同符號可能出現在不同貨幣上。`,['countries'],[cur.name,...(short.length>=2?[short]:[]),...(currencyAlias[code]||[]),...({XCD:['東加勒比海元','東加勒比幣','東加勒比海幣'],XOF:['西非法郎','西非金融共同體法郎'],XAF:['中非法郎','中非金融合作法郎'],RSD:['塞爾維亞戴納','戴納'],AWG:['阿魯巴盾','阿路巴盾','弗羅林']})[code]||[]]);
}
for(const c of take(spread(countries.filter(c=>c.tld.some(t=>/^\.[a-z]{2}$/.test(t))&&!['AQ','BV','UM','EH','SS','KP'].includes(c.cca2))),80,'domains')) {
 const tld=c.tld.find(t=>/^\.[a-z]{2}$/.test(t));
 add('domain','科技與導航','fill',`看到網址結尾「${tld}」，它對應哪個國家或地區的國家代碼頂級網域？`,name(c),`${tld} 對應${name(c)}。這類網域稱為 ccTLD；它表示網域註冊體系的地理對應，不保證網站伺服器、經營者或內容真的位於當地。`,['countries'],aliases(c));
}
for(const c of take(spread(countries.filter(c=>c.idd.root&&c.idd.suffixes.length===1&&!['VA','KZ','RU','DO','PR','JM','CA','US'].includes(c.cca2))),60,'calling')) {
 const code=c.idd.root+c.idd.suffixes[0];
 add('calling','科技與導航','fill',`從國外撥打${name(c)}的一般電話時，使用的「+國碼／地區碼」組合是多少？（填 + 後的數字）`,code,`${name(c)}的國際電話開頭碼是 ${code}。「+」代表由撥出地選擇國際直撥前綴，國碼則用來識別電話編號體系。若這組碼以 +1 開頭，後面還含北美編號計畫的地區碼。`,['countries'],[code.slice(1),`00${code.slice(1)}`]);
}
// Country border signatures are used only when the complete set is unique in the snapshot.
const signatures = new Map();
for(const c of countries) {const s=[...c.borders].sort().join(',');signatures.set(s,(signatures.get(s)||0)+1);}
const borderCandidates=spread(countries.filter(c=>c.borders.length>=2&&c.borders.length<=6&&c.borders.every(b=>by3[b])&&signatures.get([...c.borders].sort().join(','))===1&&!['PS','IL','XK','RS','MA','EH','UA','RU','CN','IN','PK','GE','AM','AZ','CY','TR'].includes(c.cca2)));
for(const c of take(borderCandidates,70,'borders')) {
 const ns=c.borders.map(b=>name(by3[b]));
 add('border-signature','地圖與地理','fill',`邊界拼圖：陸地相鄰的國家或地區是${ns.join('、')}。這組名單對應哪個國家？（歐洲國家以歐洲本土為準）`,name(c),`資料列出的${name(c)}陸地相鄰國家或地區為${ns.join('、')}，共 ${ns.length} 個。這裡不計隔海相望的國家，也不把橋梁或海底隧道連接自動當成陸地國界。`,['countries'],aliases(c));
}
function parseCsv(text) { const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field='';}else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=c;}if(field||row.length){row.push(field);rows.push(row);}const headers=rows.shift();return rows.filter(r=>r.length===headers.length).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]]))); }
const allAirports=parseCsv(fs.readFileSync(new URL('./research/airport-codes.csv',import.meta.url),'utf8'));
const airports=allAirports.filter(a=>a.type==='large_airport'&&/^[A-Z]{3}$/.test(a.iata_code)&&by2[a.iso_country]&&a.municipality);
const airportPerCountry={};
const majorAirportCodes='TPE KHH HND NRT ICN GMP PVG PEK HKG MFM BKK HKT KUL PEN SIN CGK DPS SGN HAN MNL CEB DEL BOM DXB AUH DOH IST SAW LHR LGW CDG ORY AMS BRU FRA MUC FCO MXP MAD BCN LIS OPO ZRH GVA VIE CPH OSL ARN HEL WAW KRK PRG BUD ATH OTP SOF BEG ZAG SVO LED YYZ YVR JFK LAX MEX CUN GRU GIG EZE SCL LIM BOG UIO PTY SJO HAV SDQ NAS AKL WLG SYD MEL NAN PPT NBO ADD JNB CPT CAI HRG CMN RAK TUN ALG ACC LOS ABV DSS MRU SEZ MLE KTM CMB DAC KHI ISB TAS ALA'.split(' ');
const airportOrdered=[...majorAirportCodes.map(code=>airports.find(a=>a.iata_code===code)).filter(Boolean),...spread(airports).filter(a=>!majorAirportCodes.includes(a.iata_code))];
const selectedAirports=take(airportOrdered.filter(a=>{airportPerCountry[a.iso_country]=(airportPerCountry[a.iso_country]||0)+1;return airportPerCountry[a.iso_country]<=2;}),120,'airports');
for(const a of selectedAirports) {
 const c=by2[a.iso_country];
 add('airport-country','航空與機場','fill',`行李條上寫著 ${a.iata_code}：${a.name}。這座機場位於哪個國家或地區？`,name(c),`${a.iata_code} 對應 ${a.name}，資料中的城市欄為 ${a.municipality}，所在地為${name(c)}。IATA 的三字母代碼常見於機票與行李條，不一定剛好等於城市英文名稱的前三個字母。`,['airports'],aliases(c));
}
for(const c of take(spread(countries.filter(c=>c.flag&&c.unMember&&!['ID','MC','RO','TD','IE','CI','NZ','AU','NL','LU','SI','SK','RU','HR','RS'].includes(c.cca2))),60,'flags')) {
 add('flag','國家與文化','fill','認旗挑戰：這面旗幟屬於哪個國家？',name(c),`這是${name(c)}的旗幟。這個國家位於${subregions[c.subregion]||regions[c.region]}；辨識國旗時，可留意色帶的方向、排列順序與徽記的組合。`,['countries','flag-icons'],aliases(c));
 questions.at(-1).image=`./assets/flags/${c.cca2.toLowerCase()}.svg`;
}
for(const c of take(spread(countries.filter(c=>subregions[c.subregion]&&c.unMember&&!['RU','TR','CY','GE','AM','AZ','KZ','EG','ID'].includes(c.cca2))),50,'subregions')) {
 const r=subregions[c.subregion];
 add('subregion','地圖與地理','fill',`依 Countries 公開資料集的地理分區，${name(c)}歸入${regions[c.region]}的哪個次區域？`,r,`${name(c)}在來源資料中歸入 ${c.subregion}（${r}）。次區域是一種整理地理資料的慣例，和語言、文化或政治集團的範圍不一定一致。`,['countries'],[c.subregion,{'北美洲北部':'北美','加勒比地區':'加勒比海','南部非洲':'南非地區','澳洲與紐西蘭':'澳紐','玻里尼西亞':'波利尼西亞'}[r]].filter(Boolean));
}
const airportNames={TPE:'桃園國際機場',TSA:'台北松山機場',KHH:'高雄國際機場',HND:'東京羽田機場',NRT:'東京成田國際機場',KIX:'關西國際機場',ITM:'大阪國際機場（伊丹）',NGO:'中部國際機場（名古屋）',FUK:'福岡機場',CTS:'新千歲機場',OKA:'那霸機場',ICN:'仁川國際機場',GMP:'金浦國際機場',HKG:'香港國際機場',MFM:'澳門國際機場',SIN:'新加坡樟宜機場',KUL:'吉隆坡國際機場',BKK:'曼谷蘇凡納布機場',DMK:'曼谷廊曼機場',SGN:'胡志明市新山一國際機場',HAN:'河內內排國際機場',DAD:'峴港國際機場',CGK:'雅加達蘇卡諾哈達國際機場',DPS:'峇里島伍拉賴國際機場',MNL:'馬尼拉尼諾伊艾奎諾國際機場',CEB:'麥克坦宿霧國際機場',DEL:'德里英迪拉甘地國際機場',BOM:'孟買賈特拉帕蒂希瓦吉國際機場',DXB:'杜拜國際機場',DOH:'杜哈哈馬德國際機場',AUH:'阿布達比札耶德國際機場',IST:'伊斯坦堡機場',SAW:'伊斯坦堡薩比哈格克琴國際機場',LHR:'倫敦希斯洛機場',LGW:'倫敦蓋威克機場',CDG:'巴黎戴高樂機場',ORY:'巴黎奧利機場',AMS:'阿姆斯特丹史基浦機場',FRA:'法蘭克福機場',MUC:'慕尼黑機場',ZRH:'蘇黎世機場',VIE:'維也納國際機場',FCO:'羅馬費烏米奇諾機場',MXP:'米蘭馬爾彭薩機場',MAD:'馬德里巴拉哈斯機場',BCN:'巴塞隆納埃爾普拉特機場',LIS:'里斯本溫貝托德爾加多機場',CPH:'哥本哈根凱斯楚普機場',HEL:'赫爾辛基萬塔機場',ARN:'斯德哥爾摩阿蘭達機場',OSL:'奧斯陸加勒穆恩機場',JFK:'紐約約翰甘迺迪國際機場',EWR:'紐華克自由國際機場',LAX:'洛杉磯國際機場',SFO:'舊金山國際機場',SEA:'西雅圖塔科馬國際機場',ORD:'芝加哥歐海爾國際機場',YYZ:'多倫多皮爾遜國際機場',YVR:'溫哥華國際機場',SYD:'雪梨京斯福史密斯機場'};
for(const [code,zh] of Object.entries(airportNames)) {const a=allAirports.find(a=>a.iata_code===code&&a.type!=='closed');if(!a)throw Error(code);add('airport-iata','航空與機場','fill',`${zh}在機票和行李條上使用哪個三字母 IATA 代碼？`,code,`${zh}（${a.name}）的 IATA 代碼是 ${code}。${a.icao_code?`航管資料使用的 ICAO 代碼則是 ${a.icao_code}，兩者不宜混用。`:'IATA 的三字母代碼和航管使用的四字母 ICAO 代碼是不同系統。'}`,['airports'],[code.toLowerCase()]);}
for(const c of take(spread(countries.filter(c=>c.unMember&&c.cca3&&c.cca3!==c.name.common.toUpperCase())),40,'country-code')) {add('country-code','科技與導航','fill',`國際地理資料中的 ISO 3166-1 三字母代碼「${c.cca3}」，代表哪個國家？`,name(c),`${c.cca3} 是${name(c)}的三字母國家代碼，兩字母形式則為 ${c.cca2}。它們常用來對接地圖與統計資料；國家代碼和航空公司的代碼、機場的代碼屬於不同系統。`,['countries'],aliases(c));}
// Choice: comparing source areas, not politically sensitive border rankings.
const areaCountries=spread(countries.filter(c=>c.unMember&&c.area>10000&&!['CN','IN','PK','UA','RU','MA','IL'].includes(c.cca2)));
for(let i=0;i<30;i++) {const group=[0,1,2,3].map(k=>areaCountries[(i*4+k)%areaCountries.length]);const largest=[...group].sort((a,b)=>b.area-a.area)[0];add('area-comparison','地圖與地理','choice',`攤開地圖：${group.map(name).join('、')}之中，哪一國的面積最大？`,name(largest),group.map(c=>`${name(c)}約 ${c.area.toLocaleString('en-US')} 平方公里`).join('；')+'。地圖投影可能放大高緯度地區，因此畫面上的大小不一定能直接比較真實面積。',['countries'],aliases(largest),group.map(name));}
const elevated=spread(airports.filter(a=>a.elevation_ft&&Number(a.elevation_ft)>1000));
const low=spread(airports.filter(a=>a.elevation_ft&&Number(a.elevation_ft)>=0&&Number(a.elevation_ft)<300));
for(let i=0;i<30;i++) {const high=elevated[i], group=[high,...[0,1,2].map(k=>low[(i*3+k)%low.length])];const label=a=>`${a.iata_code} · ${a.municipality}`;const opts=group.map(label);for(let j=0;j<i%4;j++)opts.push(opts.shift());add('airport-elevation','航空與機場','choice',`機場 ${group.map(a=>a.iata_code).join('、')} 之中，哪座的海拔最高？`,label(high),group.map(a=>`${a.iata_code}（${a.municipality}）約 ${Math.round(Number(a.elevation_ft)*0.3048).toLocaleString('en-US')} 公尺`).join('；')+'。機場標高會影響空氣密度，是飛行性能計算的重要條件。',['airports'],[],opts);}
// ISO language code questions avoid conflating a database language list with legal official-language status.
const languages=[...new Map(countries.flatMap(c=>Object.entries(c.languages))).entries()].filter(([code])=>/^[a-z]{3}$/.test(code)&&!['bar','cnr','nfr','smi'].includes(code));
const commonLanguageCodes=['jpn','kor','zho','eng','fra','deu','spa','por','ita','rus','ara','hin','ben','ind','msa','tha','vie','khm','lao','mya','nep','fas','tur','ell','heb','swe','fin','dan','pol','ukr'];
for(const [i,code] of commonLanguageCodes.entries()) {const l=languages.find(([k])=>k===code);if(!l)throw Error(code);const zh=languageNames.of(code);const distractors=commonLanguageCodes.filter(k=>k!==code).filter(k=>languageNames.of(k)!==zh).slice(i%15,i%15+3).map(k=>languageNames.of(k));const opts=[zh,...distractors];for(let j=0;j<i%4;j++)opts.push(opts.shift());add('language-code','科技與導航','choice',`多語言地圖或資料表中的三字母語言代碼「${code}」，代表哪一種語言？`,zh,`「${code}」對應${zh}（${l[1]}）。語言代碼和國家代碼是不同的系統：同一種語言可以跨越很多國界，一個國家也可以使用多種語言。`,['countries'],[l[1]],opts);}
const landCountries=spread(countries.filter(c=>c.unMember&&c.area>1000&&!['IL','PS','MA','RU','UA','CN','IN','PK'].includes(c.cca2)));
const landTrue=take(landCountries.filter(c=>c.landlocked),23,'landlocked');
const landFalse=take(landCountries.filter(c=>!c.landlocked),22,'coastal');
for(const c of [...landTrue,...landFalse]) {add('landlocked','地圖與地理','boolean',`${name(c)}是沒有直接通往外海的內陸國。`,c.landlocked?'是':'否',c.landlocked?`${name(c)}被陸地包圍，沒有直接通往海洋的海岸線。內陸國仍可能有湖泊、河港或透過鄰國使用的海港。`:`${name(c)}並不是內陸國。判斷內陸國的關鍵是有沒有直接接觸海洋，而不是首都離海有多遠。`,['countries'],[],['是','否']);}
const usedPairs=new Set();const boolBorders=[];
for(const c of spread(countries.filter(c=>c.unMember&&c.borders.length>0&&!['PS','IL','XK','RS','MA','EH','UA','RU','CN','IN','PK','GE','AM','AZ','CY','TR'].includes(c.cca2)))) {const b=c.borders.map(k=>by3[k]).find(b=>b&&b.unMember&&!['PS','IL','XK','RS','MA','EH','UA','RU','CN','IN','PK','GE','AM','AZ','CY','TR'].includes(b.cca2)&&!usedPairs.has([c.cca2,b.cca2].sort().join('-')));if(b){usedPairs.add([c.cca2,b.cca2].sort().join('-'));boolBorders.push([c,b,true]);}if(boolBorders.length===23)break;}
for(const c of spread(countries.filter(c=>c.unMember&&c.borders.length>0))) {const b=spread(countries.filter(b=>b.unMember&&b.region===c.region&&b.cca2!==c.cca2&&!c.borders.includes(b.cca3)&&!b.borders.includes(c.cca3)&&!usedPairs.has([c.cca2,b.cca2].sort().join('-'))))[0];if(b){usedPairs.add([c.cca2,b.cca2].sort().join('-'));boolBorders.push([c,b,false]);}if(boolBorders.length===45)break;}
for(const [c,b,yes] of boolBorders) {add('border-pair','地圖與地理','boolean',`${name(c)}與${name(b)}有直接相接的陸地國界。`,yes?'是':'否',yes?`兩國在來源資料的陸地鄰國清單中相接。${name(c)}所列的鄰國包括${c.borders.map(k=>name(by3[k])).join('、')}。`:`${name(c)}與${name(b)}不在彼此的陸地鄰國清單中。同處一個洲、隔海相望或有航線往來，都不等於具有陸地國界。`,['countries'],[],['是','否']);}
const sources=[{id:'countries',title:'Countries — 國家與地區公開資料集（2026-11-09 下載快照）',url:'https://github.com/mledoze/countries',publisher:'mledoze / countries contributors',accessedAt:day,license:'ODbL 1.0；本檔衍生資料同以 ODbL 1.0 提供，原始授權見 scripts/research/countries-LICENSE.txt。',snapshotSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('./research/countries.json',import.meta.url))).digest('hex')},{id:'airports',title:'OurAirports 機場資料 — DataHub airport-codes 衍生快照',url:'https://github.com/datasets/airport-codes',publisher:'OurAirports contributors / DataHub',accessedAt:day,license:'OurAirports 公有領域資料；DataHub 標示 ODC-PDDL-1.0。',snapshotSha256:crypto.createHash('sha256').update(fs.readFileSync(new URL('./research/airport-codes.csv',import.meta.url))).digest('hex')}];
sources.push({id:'flag-icons',title:'flag-icons：本地國旗 SVG 圖像',url:'https://github.com/lipis/flag-icons',publisher:'Panayiotis Lipiridis and contributors',accessedAt:day,license:'MIT License；原始授權保留於 assets/flags/LICENSE.txt。'});
const counts=Object.fromEntries(['fill','choice','boolean'].map(t=>[t,questions.filter(q=>q.type===t).length]));
if(questions.length!==900||counts.fill!==720||counts.choice!==90||counts.boolean!==90)throw Error(JSON.stringify(counts));
for(const q of questions){if(q.type!=='fill'&&(!q.options.includes(q.answer)||new Set(q.options).size!==q.options.length))throw Error(q.id);}
fs.writeFileSync(new URL('../data/geography.json',import.meta.url),JSON.stringify({license:'The country-derived database is made available under ODbL 1.0; see sources and retained license.',provenance:'Derived from the retained source snapshots. checkedAt records dataset retrieval and automated consistency checking, not individual verification by an official national authority. Chinese labels use ICU/CLDR and reviewed aliases.',sources,questions},null,2)+'\n');
console.log(JSON.stringify({total:questions.length,types:counts,families:Object.fromEntries([...new Set(questions.map(q=>q.family))].map(f=>[f,questions.filter(q=>q.family===f).length]))},null,2));
