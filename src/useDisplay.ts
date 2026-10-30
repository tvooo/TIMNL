import { useLocation } from 'react-router-dom';
import { DISPLAYS, isDisplayName, type DisplayName } from './config/displays';

export function useDisplay() {
  const param = new URLSearchParams(useLocation().search).get('display');
  const name: DisplayName = isDisplayName(param) ? param : 'kindle';
  return { name, ...DISPLAYS[name] };
}
