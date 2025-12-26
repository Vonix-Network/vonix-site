'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  children: React.ReactNode;
  className?: string;
}

export function Accordion({ 
  type = 'single', 
  defaultValue, 
  children, 
  className 
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = React.useCallback((value: string) => {
    setOpenItems((prev) => {
      if (type === 'single') {
        return prev.includes(value) ? [] : [value];
      }
      return prev.includes(value)
        ? prev.filter((item: any) => item !== value)
        : [...prev, value];
    });
  }, [type]);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn('space-y-2', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const isOpen = context.openItems.includes(value);

  return (
    <div 
      className={cn(
        'rounded-lg border border-white/10 overflow-hidden transition-all',
        isOpen && 'border-neon-cyan/30 shadow-lg shadow-neon-cyan/5',
        className
      )}
      data-state={isOpen ? 'open' : 'closed'}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { 
            value, 
            isOpen 
          });
        }
        return child;
      })}
    </div>
  );
}

interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
  value?: string;
  isOpen?: boolean;
}

export function AccordionTrigger({ 
  children, 
  className, 
  value,
  isOpen 
}: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error('AccordionTrigger must be used within Accordion');

  return (
    <button
      type="button"
      onClick={() => value && context.toggleItem(value)}
      className={cn(
        'flex w-full items-center justify-between p-4 text-left font-medium transition-all',
        'hover:bg-white/5',
        isOpen && 'bg-white/5',
        className
      )}
    >
      {children}
      <ChevronDown 
        className={cn(
          'h-5 w-5 text-muted-foreground transition-transform duration-200',
          isOpen && 'rotate-180 text-neon-cyan'
        )} 
      />
    </button>
  );
}

interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
}

export function AccordionContent({ 
  children, 
  className,
  isOpen 
}: AccordionContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | undefined>(0);

  React.useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200 ease-in-out',
        className
      )}
      style={{ height }}
    >
      <div ref={contentRef} className="p-4 pt-0">
        {children}
      </div>
    </div>
  );
}

