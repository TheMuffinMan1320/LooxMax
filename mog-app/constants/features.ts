import { Feature } from '@/types';

export const FEATURES: Feature[] = [
  {
    id: 'jawline',
    name: 'Jawline',
    score: 6.4,
    icon: 'face.smiling',
    description: 'A defined jawline signals low body fat, testosterone, and strong bone structure. It is one of the most impactful features in male facial attractiveness.',
    modules: [
      { id: 'jaw-1', title: 'Mewing & Tongue Posture', body: 'Proper tongue posture (mewing) applies upward pressure on the palate over time, which can improve jaw definition and midface structure. Keep your tongue flat on the roof of your mouth at all times.' },
      { id: 'jaw-2', title: 'Body Fat Reduction', body: 'The jawline becomes dramatically more visible as facial fat decreases. Target 10–12% body fat for visible jaw definition. Caloric deficit + resistance training is the path.' },
      { id: 'jaw-3', title: 'Chewing & Masseter Hypertrophy', body: 'Chewing hard foods (mastic gum, tough meats) can hypertrophy the masseter muscle, widening and squaring the lower face.' },
    ],
  },
  {
    id: 'cheekbones',
    name: 'Cheekbones',
    score: 7.1,
    icon: 'sparkles',
    description: 'High, prominent cheekbones create facial width in the upper-mid face and are associated with dominance and health.',
    modules: [
      { id: 'cheek-1', title: 'Body Fat & Facial Hollow', body: 'Lower body fat reveals the natural prominence of your cheekbones. The "hollow" under the cheekbone becomes visible below ~12% body fat.' },
      { id: 'cheek-2', title: 'Facial Yoga & Resistance', body: 'Exercises targeting the zygomaticus and buccinator can subtly enhance cheekbone prominence and reduce facial puffiness.' },
      { id: 'cheek-3', title: 'Contouring (Short Term)', body: 'Strategic grooming and lighting can enhance the appearance of cheekbones immediately while working on long-term improvements.' },
    ],
  },
  {
    id: 'canthal-tilt',
    name: 'Canthal Tilt',
    score: 5.8,
    icon: 'eye',
    description: 'Canthal tilt refers to the angle of the outer corners of the eyes relative to the inner corners. A positive tilt (outer corner higher) reads as dominant and attractive.',
    modules: [
      { id: 'cant-1', title: 'Bone Smashing & Orbital Rim', body: 'Controversial but discussed in the community — orbital bone remodeling through mechanical stimulation. Currently no strong evidence; pursue at your own discretion.' },
      { id: 'cant-2', title: 'Eye Area Grooming', body: 'Properly shaped brows can visually enhance your canthal tilt. Arching the tail of the brow upward draws the eye upward, mimicking a positive tilt.' },
      { id: 'cant-3', title: 'Sleep Position', body: 'Sleeping on your back reduces fluid retention around the eyes, which can slightly improve the crispness and appearance of the eye area.' },
    ],
  },
  {
    id: 'skin',
    name: 'Skin Quality',
    score: 7.8,
    icon: 'sun.max',
    description: 'Clear, even-toned, glowing skin signals health and youth. It is one of the highest-ROI areas to improve because progress is fast and visible.',
    modules: [
      { id: 'skin-1', title: 'Core Routine (AM/PM)', body: 'AM: Cleanser → Vitamin C serum → SPF 50+ moisturizer. PM: Cleanser → Retinol (start 0.025%) → Moisturizer. Consistency over 90 days is required to see full results.' },
      { id: 'skin-2', title: 'Diet & Hydration', body: 'Eliminate seed oils, refined sugar, and dairy if you are acne-prone. Drink 3–4L water daily. Omega-3 supplementation reduces inflammatory acne.' },
      { id: 'skin-3', title: 'Sun Protection', body: 'SPF 50+ daily is the single most impactful anti-aging intervention. UV exposure causes collagen breakdown, dark spots, and uneven texture — even on cloudy days.' },
      { id: 'skin-4', title: 'Sleep & Cortisol', body: '8 hours of sleep is when skin repair occurs. Chronically elevated cortisol accelerates aging and worsens acne. Manage stress through exercise and sleep hygiene.' },
    ],
  },
  {
    id: 'symmetry',
    name: 'Facial Symmetry',
    score: 6.9,
    icon: 'align.horizontal.center',
    description: 'Symmetry is a proxy for genetic health. Small asymmetries are normal and often unnoticeable, but significant ones can affect attractiveness scores.',
    modules: [
      { id: 'sym-1', title: 'Chewing Symmetry', body: 'Habitually chewing on one side creates muscular imbalance. Consciously alternate sides when eating to balance masseter development.' },
      { id: 'sym-2', title: 'Sleep Position', body: 'Side sleeping compresses one side of the face for hours nightly. Back sleeping prevents this asymmetry from worsening over time.' },
      { id: 'sym-3', title: 'Posture & Head Position', body: 'A chronically tilted head leads to asymmetrical muscular tension in the neck and jaw. Neck stretches and proper monitor height help correct this.' },
    ],
  },
  {
    id: 'hair',
    name: 'Hair',
    score: 7.5,
    icon: 'wind',
    description: 'Hair density, style, and health have a large effect on first impressions and perceived attractiveness. Hairline and fullness also matter significantly.',
    modules: [
      { id: 'hair-1', title: 'Hair Loss Prevention', body: 'If experiencing thinning, finasteride (1mg/day) + minoxidil (topical 5%) is the evidence-backed combination. Start early — prevention is easier than regrowth.' },
      { id: 'hair-2', title: 'Style & Length', body: 'Find a style suited to your face shape. Generally: oval faces suit most styles; square faces benefit from textured tops; long faces suit width on the sides.' },
      { id: 'hair-3', title: 'Scalp Health', body: 'A healthy scalp grows healthier hair. Use a scalp-specific shampoo, avoid overwashing, and consider a scalp massager (shown to increase hair thickness in studies).' },
    ],
  },
  {
    id: 'body-composition',
    name: 'Body Composition',
    score: 6.2,
    icon: 'figure.strengthtraining.traditional',
    description: 'Body fat percentage and muscle mass directly impact facial appearance, posture, and overall physical presence. The foundation of the entire lookxmax stack.',
    modules: [
      { id: 'body-1', title: 'Target Body Fat', body: 'For men, 10–15% body fat is the optimal range — lean enough to show facial definition, muscular enough to look healthy. Below 10% the face can look gaunt.' },
      { id: 'body-2', title: 'Resistance Training', body: 'Lift 4x per week minimum. Focus on compound lifts (squat, deadlift, bench, overhead press, row). Muscle mass improves posture, frame, and overall presence.' },
      { id: 'body-3', title: 'Protein & Nutrition', body: 'Target 0.8–1g of protein per pound of bodyweight. Prioritize whole foods. Track calories if not at goal body fat — guessing rarely works.' },
    ],
  },
];
