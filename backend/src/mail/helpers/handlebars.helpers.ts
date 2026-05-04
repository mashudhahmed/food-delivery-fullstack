import * as Handlebars from 'handlebars';

export const registerHandlebarsHelpers = () => {
  // Multiply helper
  Handlebars.registerHelper('multiply', (a: number, b: number) => {
    return a * b;
  });

  // Times helper for generating stars
  Handlebars.registerHelper('times', (n: number, options: any) => {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn(this);
    }
    return result;
  });

  // Get initials for avatar
  Handlebars.registerHelper('getInitials', (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  // Format date
  Handlebars.registerHelper('formatDate', (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  // Get progress for status
  Handlebars.registerHelper('getStatusProgress', (status: string) => {
    const progressMap: Record<string, number> = {
      pending: 20,
      preparing: 40,
      ready: 60,
      picked_up: 80,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  });

  // Compare status
  Handlebars.registerHelper('gteStatus', (current: string, target: string, options: any) => {
    const order = ['pending', 'preparing', 'ready', 'picked_up', 'delivered'];
    const currentIndex = order.indexOf(current);
    const targetIndex = order.indexOf(target);
    return currentIndex >= targetIndex;
  });
};