import React from 'react';
import { ShieldCheck, Calendar, Star, Award, FileText } from 'lucide-react';

interface ScannedDocumentPageProps {
  pageNumber: number;
  content: string;
  searchQuery: string;
  documentName: string;
  documentId: string;
}

export const ScannedDocumentPage: React.FC<ScannedDocumentPageProps> = ({
  pageNumber,
  content,
  searchQuery,
  documentName,
  documentId,
}) => {
  // Highlight helper
  const renderHighlightedText = (text: string, search: string) => {
    if (!search || !text) return <span className="whitespace-pre-wrap">{text}</span>;
    
    const parts = text.split(new RegExp(`(${search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return (
      <span className="whitespace-pre-wrap">
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 text-slate-900 rounded-sm px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const isSouthernProvinceCircular = 
    documentId === 'doc-timetable' || 
    documentName.toLowerCase().includes('කාල සටහන') || 
    documentName.toLowerCase().includes('southern') ||
    documentName.toLowerCase().includes('timetable');

  if (!isSouthernProvinceCircular) {
    // Elegant default paper document layout for all other PDF/Word documents
    return (
      <div 
        id="default-scanned-page"
        className="w-full bg-white text-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 min-h-[480px] flex flex-col justify-between font-sans relative"
      >
        {/* Subtle physical paper texture simulation */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] rounded-xl" />
        
        <div>
          {/* Default Document Header */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-500" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">PDF Master Secure Scan</span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              PG. {pageNumber}
            </span>
          </div>

          <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-tight border-b border-slate-50/50 pb-2">
            {documentName}
          </h2>

          <div className="text-xs leading-relaxed text-slate-700 tracking-normal font-sans text-left">
            {renderHighlightedText(content, searchQuery)}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 font-mono">
          <span>MD5 SECURE HASH VERIFIED</span>
          <div className="flex items-center gap-1 text-emerald-600 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SECURE SYSTEM DECRYPTED</span>
          </div>
        </div>
      </div>
    );
  }

  // JAW-DROPPING HIGH FIDELITY EMBEDDED RENDERER FOR THE SOUTHERN PROVINCE CIRCULAR
  return (
    <div 
      id="southern-province-circular-page"
      className="w-full bg-[#f9f9fa] text-slate-800 p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 min-h-[580px] flex flex-col justify-between relative font-sans overflow-hidden select-none"
      style={{
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.94)), radial-gradient(#aaa 1px, transparent 1px)',
        backgroundSize: '100% 100%, 24px 24px',
      }}
    >
      {/* Page Header (Only visible on page 1) */}
      {pageNumber === 1 && (
        <div className="border-b-2 border-slate-800 pb-4 mb-5 text-center relative">
          
          {/* Top Sri Lankan National Flag Emblem Frame & Flower Emblem Frame */}
          <div className="flex justify-between items-center mb-3">
            {/* Left box: Lion flag simulation */}
            <div className="w-10 h-7 border border-slate-500 bg-slate-100 flex flex-col justify-center items-center rounded-sm">
              <div className="w-8 h-5 bg-[#7b1113] relative flex items-center justify-center text-[7px] text-yellow-400 font-bold rounded-sm">
                🦁
              </div>
            </div>

            {/* Center State Emblem Logo representation */}
            <div className="w-12 h-12 rounded-full border border-slate-700 bg-white flex items-center justify-center p-1 shadow-sm">
              <div className="w-full h-full rounded-full border-2 border-slate-600 bg-amber-50/30 flex flex-col items-center justify-center relative">
                <span className="text-[12px] leading-none">☸️</span>
                <span className="text-[7px] font-black scale-90 leading-none text-slate-700 mt-0.5">SL</span>
              </div>
            </div>

            {/* Right box: Water Lily simulation */}
            <div className="w-10 h-7 border border-slate-500 bg-slate-100 flex flex-col justify-center items-center rounded-sm">
              <span className="text-xs">🌸</span>
            </div>
          </div>

          {/* Department names in three official languages */}
          <h1 className="text-[13px] font-extrabold text-slate-900 tracking-wide font-sans">
            දකුණු පළාත් අධ්‍යාපන දෙපාර්තමේන්තුව
          </h1>
          <h2 className="text-[10px] font-bold text-slate-700 tracking-wide">
            தென் மாகாணக் கல்வித் திணைக்களம்
          </h2>
          <h3 className="text-[11px] font-black text-slate-800 tracking-widest font-serif uppercase mt-0.5">
            Department of Education - Southern Province
          </h3>

          {/* Addresses */}
          <div className="flex justify-between text-[8px] text-slate-500 mt-2 font-mono px-1">
            <span>ඉහළ ඩික්සන් පාර, ගාල්ල.</span>
            <span>மேல் டிக்சன் வீதி, காலி.</span>
            <span>Upper Dickson Road, Galle.</span>
          </div>

          {/* Reference numbers frame exactly like screenshot */}
          <div className="grid grid-cols-3 border-t border-slate-300 mt-2.5 pt-1.5 text-left text-[7px] font-semibold text-slate-600">
            <div>
              <p>මගේ අංකය / எனது இல / My No</p>
              <p className="text-[9px] font-bold text-slate-800 mt-0.5">දප/අපද/ජාපා/03/උ.පෙළ</p>
            </div>
            <div className="border-x border-slate-200 px-1.5">
              <p>ඔබේ අංකය / உமது இல / Your No</p>
              <p className="text-[9px] font-bold text-slate-800 mt-0.5">දප/විභාග/2026/08</p>
            </div>
            <div className="pl-1.5">
              <p>දිනය / திகதி / Date</p>
              <p className="text-[9px] font-bold text-slate-800 mt-0.5">2026 . 06 . 15</p>
            </div>
          </div>
        </div>
      )}

      {/* Page Title (Changes per page) */}
      <div className="flex-1 text-left">
        {pageNumber === 1 && (
          <div className="space-y-4">
            <div className="text-[10px] leading-relaxed text-slate-700 font-medium">
              කලාප අධ්‍යාපන අධ්‍යක්ෂ මඟින්,<br />
              12-13 ශ්‍රේණි ක්‍රියාත්මක සියලුම පාසල්වල විදුහල්පතිවරුන්,<br />
              පරිවේණාධිපති ස්වාමීන් වහන්සේලා වෙත.
            </div>

            <div className="text-center py-1">
              <h4 className="text-xs font-black text-slate-900 border-b border-slate-800 inline-block pb-0.5">
                12-13 ශ්‍රේණි අවසන් වාර පරීක්ෂණය - 2026
              </h4>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-800 font-sans text-justify">
              උක්ත කරුණ සම්බන්ධයෙන් “වාර අවසාන ශිෂ්‍ය සාධන ඇගයීම් පැවැත්වීම - 2026” මැයෙන් ඔබ වෙත යොමු කරන ලද අපගේ අංක දප/අපද/ජාපා/05/දෙව.පරීක්ෂණ-2026 හා 2026.03.17 දිනැති ලිපිය හා බැඳේ.
            </p>

            <p className="text-[10px] leading-relaxed text-slate-800 font-sans text-justify">
              <span className="font-bold">02.</span> ඒ අනුව, 2026 වර්ෂයේ 12-13 ශ්‍රේණි සඳහා අවසන් වාර පරීක්ෂණය <span className="font-semibold text-rose-600 bg-rose-50 px-1 rounded">2026 ජූලි මස 01 දින</span> සිට <span className="font-semibold text-rose-600 bg-rose-50 px-1 rounded">ජූලි මස 22 දින</span> දක්වා සතියේ දින 16 ක දී පැවැත්වීමට තීරණය කර ඇති අතර, එම පරීක්ෂණය සඳහා අනුමත කාල සටහන මේ සමඟ ඉදිරිපත් කරමි.
            </p>
            
            <p className="text-[10px] leading-relaxed text-slate-700 font-sans text-justify">
              එහි අඩංගු විෂයයන් සඳහා දකුණු පළාත් අධ්‍යාපන දෙපාර්තමේන්තුව විසින් පහතින් දක්වා ඇති පරිදි මුද්‍රිත ප්‍රශ්නපත්‍ර සපයනු ලැබේ.
            </p>
          </div>
        )}

        {pageNumber === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-xs font-black text-slate-900 border-b border-slate-800 inline-block pb-0.5">
                අනුමත කාලසටහන සහ විෂය මාධ්‍ය ලේඛනය
              </h4>
            </div>

            {/* Sinhala Medium */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-slate-900 bg-slate-200/60 px-1.5 py-0.5 rounded">සිංහල මාධ්‍ය (Sinhala Medium)</h5>
              <p className="text-[10px] leading-relaxed text-slate-800 pl-3">
                01. කාල සටහනේ දක්වා ඇති සියලුම විෂයයන් සඳහා මුද්‍රිත ප්‍රශ්නපත්‍ර ලබාදේ.
              </p>
            </div>

            {/* Tamil Medium */}
            <div className="space-y-1">
              <h5 className="text-[11px] font-bold text-slate-900 bg-slate-200/60 px-1.5 py-0.5 rounded">දෙමළ මාධ්‍ය (Tamil Medium)</h5>
              <p className="text-[10px] leading-relaxed text-slate-800 pl-3">
                01. දෙමළ භාෂාව හා සාහිත්‍යය<br />
                02. ඉස්ලාම් ධර්මය සහ ඉස්ලාම් ශිෂ්ටාචාරය
              </p>
            </div>

            {/* English Medium with table block style */}
            <div className="space-y-1.5">
              <h5 className="text-[11px] font-bold text-slate-900 bg-slate-200/60 px-1.5 py-0.5 rounded">ඉංග්‍රීසි මාධ්‍ය (English Medium)</h5>
              <div className="pl-2 space-y-1 text-[9px] text-slate-800">
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span>01. ජීව විද්‍යාව (Biology)</span>
                  <span className="font-mono text-slate-500">PRINTED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span>02. භෞතික විද්‍යාව (Physics)</span>
                  <span className="font-mono text-slate-500">PRINTED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span>03. රසායන විද්‍යාව (Chemistry)</span>
                  <span className="font-mono text-slate-500">PRINTED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span>04. සංයුක්ත ගණිතය (Combined Maths)</span>
                  <span className="font-mono text-slate-500">PRINTED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5">
                  <span>05. තොරතුරු සන්නිවේදන තාක්ෂණය (ICT)</span>
                  <span className="font-mono text-slate-500">PRINTED</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5 text-rose-700">
                  <span>06. ආර්ථික විද්‍යාව (Economics)</span>
                  <span className="font-bold font-mono">PDF FORMAT</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5 text-rose-700">
                  <span>07. ව්‍යාපාර අධ්‍යයනය (Business Studies)</span>
                  <span className="font-bold font-mono">PDF FORMAT</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-0.5 text-rose-700">
                  <span>08. ගිණුම්කරණය (Accounting)</span>
                  <span className="font-bold font-mono">PDF FORMAT</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {pageNumber === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-xs font-black text-slate-900 border-b border-slate-800 inline-block pb-0.5">
                ප්‍රශ්නපත්‍ර බෙදාහැරීමේ ක්‍රමවේදය (Distribution Strategy)
              </h4>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-800 text-justify">
              <span className="font-bold">03.</span> මෙම අවසන් වාර පරීක්ෂණයට අදාළ මුද්‍රිත ප්‍රශ්නපත්‍ර මුද්‍රණාලය විසින් <span className="font-bold text-slate-950">අදියර 02ක් (Two Phases)</span> යටතේ කොට්ඨාස අධ්‍යාපන කාර්යාල වෙත භාරදීමට නියමිත ය.
            </p>

            <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg space-y-2">
              <h5 className="text-[9px] font-extrabold text-slate-700 tracking-wider uppercase">බෙදාහැරීම් අදියර විස්තර</h5>
              <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                <div className="border-r border-slate-200 pr-1">
                  <span className="font-bold text-rose-600">අදියර 01:</span><br />
                  පළමු සතිය සඳහා අවශ්‍ය ප්‍රශ්න පත්‍ර (ජූලි 01 - 10)
                </div>
                <div className="pl-1">
                  <span className="font-bold text-rose-600">අදියර 02:</span><br />
                  දෙවන සතිය සඳහා අවශ්‍ය ප්‍රශ්න පත්‍ර (ජූලි 11 - 22)
                </div>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-700 text-justify">
              ඒ අනුව කොට්ඨාස කාර්යාල මඟින් පාසල්වල විදුහල්පතිවරුන් වෙත අදියර 02ක් යටතේ ලබා දීමට සැලසුම් කර ඇත.
            </p>
          </div>
        )}

        {pageNumber === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <h4 className="text-xs font-black text-slate-900 border-b border-slate-800 inline-block pb-0.5">
                කලාපීය සම්බන්ධීකරණය සහ අවසන් නියෝග
              </h4>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-800 text-justify">
              මෙම වාර විභාගය පැවැත්වීමේ දී මාගේ දප/අපද/ජාපා/05 සහ 2024.07.19 දිනැති “2024 වර්ෂයේ සිට ඉන් ඉදිරියට 6-13 වාර අවසාන ඇගයීම් පරීක්ෂණ පැවැත්වීම පිළිබඳ උපදෙස්” මැයෙන් නිකුත් කරන ලද 02/2024 ලිපියේ උපදෙස් ප්‍රකාරව කටයුතු කළ යුතු ය.
            </p>

            {/* Official Signature and Blue Rubber Stamp Block */}
            <div className="pt-8 flex flex-col items-end pr-4 relative">
              <div className="text-center space-y-1 relative z-10">
                {/* Simulated handwritten-like signature */}
                <div className="font-serif italic text-slate-600 text-sm tracking-widest h-6 pr-4 opacity-80 select-none">
                  S. de Silva
                </div>
                <div className="w-32 border-t border-slate-400 my-1" />
                <p className="text-[9.5px] font-bold text-slate-800">එස්. ද සිල්වා</p>
                <p className="text-[8.5px] text-slate-600">පළාත් අධ්‍යාපන අධ්‍යක්ෂක (Southern Province)</p>
                <p className="text-[8px] text-slate-500">දකුණු පළාත, ගාල්ල.</p>
              </div>

              {/* Blue ink rubber stamp behind the text */}
              <div className="absolute right-12 top-6 w-24 h-24 rounded-full border-[3px] border-dashed border-blue-600/30 flex items-center justify-center -rotate-12 pointer-events-none select-none">
                <div className="w-20 h-20 rounded-full border border-blue-600/30 flex flex-col items-center justify-center text-[6px] font-bold text-blue-600/30 text-center leading-tight">
                  <span>පළාත් අධ්‍යාපන කාර්යාලය</span>
                  <span className="text-[7px]">★ APPROVED ★</span>
                  <span>දකුණු පළාත - ගාල්ල</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time search query highlighting block */}
        {searchQuery && (
          <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-[9px] text-slate-600 text-left">
            <span className="font-bold">Search query match: </span>
            {renderHighlightedText(content, searchQuery)}
          </div>
        )}
      </div>

      {/* Page Footer (Always visible) */}
      <div className="mt-6 pt-3 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-400 font-mono">
        <span>SOUTHERN PROVINCE DEPT. OF EDUCATION</span>
        <div className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
          <Award className="w-3 h-3" />
          <span>OFFICIAL CERTIFIED SCAN</span>
        </div>
      </div>
    </div>
  );
};
