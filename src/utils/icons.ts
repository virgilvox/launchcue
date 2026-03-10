import type { Component } from 'vue'
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CalendarIcon,
  SparklesIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
  LightBulbIcon,
  BellIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'

const iconMap: Record<string, Component> = {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CalendarIcon,
  SparklesIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
  LightBulbIcon,
  BellIcon,
  WrenchScrewdriverIcon,
}

export function resolveIcon(name: string): Component {
  return iconMap[name] || DocumentTextIcon
}
