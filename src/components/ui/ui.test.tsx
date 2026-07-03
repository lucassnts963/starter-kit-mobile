import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './Card';
import { Separator } from './Separator';
import { Avatar } from './Avatar';

describe('Card (design system elucas.dev)', () => {
  it('should render composed slot parts', async () => {
    await render(
      <Card>
        <CardHeader>
          <CardTitle>Dashboard sob medida</CardTitle>
          <CardDescription>Visão em tempo real do seu processo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text>Métricas, alertas e relatórios em um só lugar.</Text>
        </CardContent>
      </Card>,
    );

    expect(screen.getByText('Dashboard sob medida')).toBeTruthy();
    expect(screen.getByText('Visão em tempo real do seu processo.')).toBeTruthy();
    expect(screen.getByText('Métricas, alertas e relatórios em um só lugar.')).toBeTruthy();
  });
});

describe('Separator', () => {
  it('should render as a thin horizontal line by default', async () => {
    await render(<Separator />);
    expect(screen.getByTestId('separator')).toBeTruthy();
  });
});

describe('Avatar', () => {
  it('should show initials fallback when there is no image source', async () => {
    await render(<Avatar fallback="Lucas Santos" />);
    expect(screen.getByText('LU')).toBeTruthy();
  });
});
