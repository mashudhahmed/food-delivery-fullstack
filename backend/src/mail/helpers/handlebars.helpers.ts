import * as Handlebars from 'handlebars';

export const registerHandlebarsHelpers = () => {
  Handlebars.registerHelper('multiply', (a: number, b: number) => a * b);

  Handlebars.registerHelper('times', function (n: number, options: any) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn(this);
    }
    return result;
  });

  Handlebars.registerHelper('getInitials', (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  Handlebars.registerHelper('formatDate', (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  Handlebars.registerHelper('getStatusProgress', (status: string) => {
    const progressMap: Record<string, number> = {
      pending: 20,
      preparing: 40,
      ready: 60,
      picked_up: 80,
      on_the_way: 90,
      delivered: 100,
      cancelled: 0,
    };
    return progressMap[status] || 0;
  });

  Handlebars.registerHelper(
    'gteStatus',
    function (current: string, target: string, options: any) {
      const order = [
        'pending',
        'preparing',
        'ready',
        'picked_up',
        'on_the_way',
        'delivered',
      ];
      const currentIndex = order.indexOf(current);
      const targetIndex = order.indexOf(target);
      if (currentIndex >= targetIndex) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
  );
};