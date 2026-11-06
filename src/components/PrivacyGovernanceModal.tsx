import React from 'react';
import { X, Shield, Lock, FileCheck, AlertCircle, Building } from 'lucide-react';
import { Language } from '../types';

interface PrivacyGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const PrivacyGovernanceModal: React.FC<PrivacyGovernanceModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-auto animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 text-[#163A63] font-bold text-lg mb-2">
          <Shield className="w-6 h-6 text-teal-600" />
          <h2>गोपनीयता नीति तथा कानुनी शासन (Privacy & Governance Policy)</h2>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>कानुनी परीक्षण सूचना:</strong> यो मस्यौदा परीक्षण प्रयोजनका लागि तयार पारिएको हो। वास्तविक सञ्चालन अघि सखुवानान्कारकट्टी गाउँ कार्यपालिकाबाट औपचारिक कानुनी अनुमोदन आवश्यक पर्दछ।
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[#163A63]" />
              १. डाटा नियन्त्रक र सञ्चालक (Data Controller)
            </h3>
            <p>
              यस प्रणालीको डाटा नियन्त्रक सखुवानान्कारकट्टी गाउँपालिका, गाउँ कार्यपालिकाको कार्यालय, सिराहा, मधेश प्रदेश, नेपाल हो। सङ्कलित सबै जनगुनासोहरू स्थानीय सरकार सञ्चालन ऐन, २०७४ र प्रचलित नेपाल कानुनअनुसार सार्वजनिक सेवा सुधारका लागि मात्र प्रयोग गरिन्छ।
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#163A63]" />
              २. पहिचान सुरक्षा र गोपनीयता (Confidentiality)
            </h3>
            <p>
              यदि नागरिकले दर्ता फाराम भर्दा <strong>'मेरो पहिचान गोप्य राखियोस्'</strong> छनोट गर्नुभएको छ भने, उहाँको नाम र सम्पर्क नम्बर वडा तहका फिल्ड कर्मचारीहरूलाई देखाइँदैन। केवल दर्ता अधिकृत र गाउँपालिका अध्यक्षले मात्र आवश्यक समन्वयका लागि हेर्न सक्नेछन्।
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-[#163A63]" />
              ३. स्वार्थको द्वन्द्व (Conflict of Interest) व्यवस्थापन
            </h3>
            <p>
              कुनै उजुरी गाउँपालिका पदाधिकारी वा कर्मचारीसँग सम्बन्धित भएमा, उक्त पदाधिकारीलाई प्रणालीबाट कुनै स्वचालित सूचना पठाइँदैन। यस्ता विषयहरू निष्पक्ष छानबिनका लागि छुट्टै संयन्त्रमा पठाइन्छ।
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">
              ४. डाटा भण्डारण र सुरक्षा (Security Standards)
            </h3>
            <p>
              सबै फाइल तथा कागजातहरू भाइरस स्क्यानिङ र सुरक्षित क्वारेन्टिन प्रक्रियाबाट मात्र स्वीकार गरिन्छ। कुनै पनि बाह्य ट्र्याकिङ वा तेस्रो-पक्षीय विज्ञापन राखिएको छैन। सबै अडिट विवरणहरू सुरक्षित रूपमा अभिलेखीकरण गरिन्छ।
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="font-bold text-slate-900 text-sm">
              ५. आपतकालीन सीमितता (Non-Emergency Notice)
            </h3>
            <p className="text-red-700 font-medium">
              यो पोर्टल २४ सै घण्टा निरन्तर निगरानी गरिने आपतकालीन सेवा होइन। आगलागी, दुर्घटना वा ज्यान जोखिममा पर्ने अवस्थामा तत्काल नेपाल प्रहरी (१००) वा एम्बुलेन्स (१०२) मा सम्पर्क गर्नुहोस्।
            </p>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#163A63] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition shadow"
          >
            बुझें / बन्द गर्नुहोस्
          </button>
        </div>
      </div>
    </div>
  );
};
