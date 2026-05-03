import * as TabsPrimitive from "@radix-ui/react-tabs"
import * as React from "react"

import { cn } from "@/shared/utils/class-names"

interface TabItem {
  key?: string;
  label?: React.ReactNode;
  children?: React.ReactNode;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (key: string) => void;
  // AntD compatibility - deprecated but still supported
  activeKey?: string;
  onChange?: (key: string) => void;
  defaultActiveKey?: string; // AntD compatibility
  children?: React.ReactNode;
  size?: 'small' | 'default' | 'large';
  items?: TabItem[];
  className?: string;
}

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ defaultValue, value, onValueChange, activeKey, onChange, defaultActiveKey, children, size, items, className, ...props }, ref) => {
  // Support AntD-style activeKey/onChange for backward compatibility
  const controlledValue = activeKey ?? value;
  const handleChange = onChange ? (key: string) => onChange(key) : onValueChange;
  const initialDefault = defaultActiveKey ?? defaultValue;
  // Collect TabPane children and render them as TabsList + TabsContent
  const panes: { key: string; tab?: React.ReactNode; children?: React.ReactNode }[] = [];
  const otherChildren: React.ReactNode[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && typeof child.type === 'object' && child.type !== null && (child.type as { displayName?: string }).displayName === 'TabPane') {
      const tabChild = child as React.ReactElement<{key?: string; tab?: React.ReactNode; children?: React.ReactNode}>;
      panes.push({
        key: tabChild.props.key ?? '',
        tab: tabChild.props.tab,
        children: tabChild.props.children,
      });
    } else {
      otherChildren.push(child);
    }
  });

  // Support items prop for programmatic tab definition
  if (items && items.length > 0) {
    return (
      <TabsPrimitive.Root
        ref={ref}
        defaultValue={initialDefault ?? items[0]?.key}
        value={controlledValue}
        onValueChange={handleChange}
        className={className}
        {...props}
      >
        <TabsList size={size}>
          {items.map((item, i) => (
            <TabsTrigger key={item.key ?? String(i)} value={String(item.key ?? i)}>{item.label}</TabsTrigger>
          ))}
        </TabsList>
        {items.map((item, i) => (
          <TabsContent key={String(item.key ?? i)} value={String(item.key ?? i)}>
            {item.children}
          </TabsContent>
        ))}
      </TabsPrimitive.Root>
    );
  }

  if (panes.length > 0) {
    return (
      <TabsPrimitive.Root
        ref={ref}
        defaultValue={initialDefault ?? panes[0]?.key}
        value={controlledValue}
        onValueChange={handleChange}
        className={className}
        {...props}
      >
        <TabsList size={size}>
          {panes.map(p => (
            <TabsTrigger key={p.key} value={String(p.key)}>{p.tab}</TabsTrigger>
          ))}
        </TabsList>
        {panes.map(p => (
          <TabsContent key={String(p.key)} value={String(p.key)}>
            {p.children}
          </TabsContent>
        ))}
        {otherChildren}
      </TabsPrimitive.Root>
    );
  }


  return (
    <TabsPrimitive.Root
      ref={ref}
      defaultValue={initialDefault}
      value={controlledValue}
      onValueChange={handleChange}
      className={className}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  )
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { size?: string }
>(({ className, size, ...props }, ref) => {
  const sizeClass = size === 'small' ? 'h-8 text-xs' : size === 'large' ? 'h-12 text-base' : 'h-10 text-sm';
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        sizeClass,
        className
      )}
      {...props}
    />
  );
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// TabPane: maps to TabsTrigger + TabsContent pair
interface TabPaneProps {
  tab?: React.ReactNode;
  key?: string;
  children?: React.ReactNode;
  className?: string;
}

const TabPane: React.FC<TabPaneProps> = ({ children }) => {
  return <>{children}</>;
};
TabPane.displayName = 'TabPane';

export { Tabs, TabsList, TabsTrigger, TabsContent, TabPane }
export type { TabsProps }
