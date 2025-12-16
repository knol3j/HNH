import React, { useRef, useEffect } from 'react';

interface DynamicDivProps extends React.HTMLAttributes<HTMLDivElement> {
    cssVars: Record<string, string | number>;
}

export const DynamicDiv: React.FC<DynamicDivProps> = ({ cssVars, className, children, ...props }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            Object.entries(cssVars).forEach(([key, val]) => {
                ref.current?.style.setProperty(key, String(val));
            });
        }
    }, [cssVars]);

    return (
        <div ref={ref} className={className} {...props}>
            {children}
        </div>
    );
};
