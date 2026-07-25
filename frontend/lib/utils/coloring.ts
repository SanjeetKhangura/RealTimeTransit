import type { RouteSummary } from '@/types/api';

export interface RouteColoring {
  isNamed: boolean;
  displayName: string;
  color: string;
}

export function getRouteColoring(route: RouteSummary): RouteColoring {
  const routeName = [route.shortName, route.longName].filter(Boolean).join(' ').toLowerCase();

  if (routeName === 'expo line') {
    return {
      isNamed: true,
      displayName: 'Expo Line',
      color: '#005aaf',
    };
  }

  if (routeName === 'millennium line') {
    return {
      isNamed: true,
      displayName: 'Millennium Line',
      color: '#FFCE36',
    };
  }

  if (routeName === 'canada line') {
    return {
      isNamed: true,
      displayName: 'Canada Line',
      color: '#00a2ce',
    };
  }

  if (routeName === 'seabus') {
    return {
      isNamed: true,
      displayName: 'SeaBus',
      color: '#87746a',
    };
  }

  if (routeName.includes('wce')) {
    return {
      isNamed: false,
      displayName: 'West Coast Express',
      color: '#811b93',
    };
  }

  return {
    isNamed: false,
    displayName: route.shortName ?? route.longName ?? route.routeId,
    color: '#000000', // Default color for unnamed routes
  };
}

