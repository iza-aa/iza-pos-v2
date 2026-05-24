"use client";

import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type SidebarIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type SidebarTabChild<TChildId extends string = string> = {
  id: TChildId;
  label: string;
  icon: SidebarIcon;
};

export type SidebarTabItem<
  TId extends string = string,
  TChildId extends string = string,
> = {
  id: TId;
  label: string;
  description: string;
  icon: SidebarIcon;
  children?: Array<SidebarTabChild<TChildId>>;
};

type SidebarTabsetProps<
  TId extends string = string,
  TChildId extends string = string,
> = {
  title: string;
  description: string;
  items: Array<SidebarTabItem<TId, TChildId>>;
  activeId: TId;
  activeChildId?: TChildId;
  onSelect: (id: TId) => void;
  onChildSelect?: (parentId: TId, childId: TChildId) => void;
  mobileOpenLabel?: string;
  mobileCloseLabel?: string;
};

export default function SidebarTabset<
  TId extends string = string,
  TChildId extends string = string,
>({
  title,
  description,
  items,
  activeId,
  activeChildId,
  onSelect,
  onChildSelect,
  mobileOpenLabel = "Open navigation menu",
  mobileCloseLabel = "Close navigation menu",
}: SidebarTabsetProps<TId, TChildId>) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<TId>>(new Set());

  useEffect(() => {
    const activeItem = items.find((item) => item.id === activeId);

    if (!activeItem?.children?.length) return;

    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(activeItem.id);
      return next;
    });
  }, [activeId, items]);

  const handleSelect = (item: SidebarTabItem<TId, TChildId>) => {
    if (item.children?.length) {
      setExpandedIds((current) => {
        const next = new Set(current);

        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }

        return next;
      });
    }

    onSelect(item.id);

    if (!item.children?.length) {
      setShowSidebar(false);
    }
  };

  const handleChildSelect = (parentId: TId, childId: TChildId) => {
    onChildSelect?.(parentId, childId);
    setExpandedIds((current) => {
      const next = new Set(current);
      next.add(parentId);
      return next;
    });
    setShowSidebar(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowSidebar(true)}
        className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:scale-105 lg:hidden"
        aria-label={mobileOpenLabel}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {showSidebar ? (
        <button
          type="button"
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          aria-label={`${mobileCloseLabel} overlay`}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 bg-white p-4 transition-transform lg:static lg:z-auto lg:flex lg:w-64 lg:translate-x-0 lg:flex-col ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSidebar(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label={mobileCloseLabel}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;
            const isExpanded = expandedIds.has(item.id);

            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-5 w-5 ${
                          isActive ? "text-white" : "text-gray-600"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p
                          className={`mt-0.5 text-xs ${
                            isActive ? "text-gray-200" : "text-gray-400"
                          }`}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>
                    {item.children?.length ? (
                      isExpanded ? (
                        <ChevronDownIcon className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 shrink-0" />
                      )
                    ) : null}
                  </div>
                </button>

                {item.children?.length && isExpanded ? (
                  <div className="ml-6 space-y-1 border-l border-gray-200 py-1 pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive =
                        activeId === item.id && activeChildId === child.id;

                      return (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => handleChildSelect(item.id, child.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition ${
                            isChildActive
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <ChildIcon
                            className={`h-3.5 w-3.5 ${
                              isChildActive ? "text-gray-900" : "text-gray-400"
                            }`}
                          />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
}
