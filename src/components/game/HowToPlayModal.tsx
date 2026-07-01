'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';

interface HowToPlayModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    number: '1',
    emoji: '🎰',
    title: 'Крути колесо',
    desc: 'Колесо фортуны выбирает реальный клуб и сезон из истории РПЛ. Каждый спин — новый клуб с его составом!',
  },
  {
    number: '2',
    emoji: '👤',
    title: 'Выбери игрока',
    desc: 'Из состава выпавшего клуба выбери игрока и укажи позицию на поле, куда его поставить. Учитывай совместимость позиций!',
  },
  {
    number: '3',
    emoji: '⚽',
    title: 'Собери XI',
    desc: 'Повторяй процесс, пока все 11 позиций в твоей формации не будут заполнены. Используй перебросы с умом!',
  },
  {
    number: '4',
    emoji: '🏆',
    title: 'Сыграй сезон',
    desc: 'Симулируй все 30 матчей сезона. Твоя цель — идеальный результат 30-0! Удачи!',
  },
];

export default function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-[#0d2d0d] border-[#0d2d0d] text-[#e2e8f0] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-[#22c55e] text-center">
            ⚽ Как играть
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 items-start p-3 rounded-xl bg-[#0a1a0a]/50 border border-[#0a1a0a]"
            >
              <div className="flex flex-col items-center shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#22c55e]/15 flex items-center justify-center text-lg">
                  {step.emoji}
                </div>
                <div className="text-[10px] font-bold text-[#22c55e] mt-1">Шаг {step.number}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-[#e2e8f0]">{step.title}</div>
                <div className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 p-3 mt-2">
          <p className="text-xs text-[#22c55e] text-center font-medium">
            💡 Совет: выбирай формацию под свой стиль игры и используй перебросы, чтобы получить нужный клуб!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
