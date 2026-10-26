// Itens acima deste valor ficam marcados como prioritários para admins.
const ADMIN_PRIORITY_THRESHOLD = 1000;
// Usuários comuns só enxergam itens com valor até este limite.
const USER_MAX_VISIBLE_VALUE = 500;

// --- Políticas de acesso por perfil (Replace Conditional with Polymorphism) ---

class AdminPolicy {
  canView() {
    return true;
  }

  // Mantém o efeito do original: o item recebido é marcado como prioritário.
  prepare(item) {
    if (item.value > ADMIN_PRIORITY_THRESHOLD) {
      item.priority = true;
    }
  }

  isHighlighted(item) {
    return Boolean(item.priority);
  }
}

class StandardUserPolicy {
  canView(item) {
    return item.value <= USER_MAX_VISIBLE_VALUE;
  }

  prepare() {}

  isHighlighted() {
    return false;
  }
}

// Perfis desconhecidos não enxergam nenhum item, como no código original.
class NoAccessPolicy {
  canView() {
    return false;
  }

  prepare() {}

  isHighlighted() {
    return false;
  }
}

const ROLE_POLICIES = {
  ADMIN: new AdminPolicy(),
  USER: new StandardUserPolicy(),
};

// --- Formatos de saída (Replace Conditional with Polymorphism) ---

class CsvFormatter {
  header() {
    return ['ID,NOME,VALOR,USUARIO'];
  }

  row(item, user) {
    return `${item.id},${item.name},${item.value},${user.name}`;
  }

  footer(total) {
    return ['', 'Total,,', `${total},,`];
  }
}

class HtmlFormatter {
  header(user) {
    return [
      '<html><body>',
      '<h1>Relatório</h1>',
      `<h2>Usuário: ${user.name}</h2>`,
      '<table>',
      '<tr><th>ID</th><th>Nome</th><th>Valor</th></tr>',
    ];
  }

  row(item, user, highlighted) {
    const style = highlighted ? ' style="font-weight:bold;"' : '';
    return `<tr${style}><td>${item.id}</td><td>${item.name}</td><td>${item.value}</td></tr>`;
  }

  footer(total) {
    return ['</table>', `<h3>Total: ${total}</h3>`, '</body></html>'];
  }
}

const FORMATTERS = {
  CSV: new CsvFormatter(),
  HTML: new HtmlFormatter(),
};

function sumValues(items) {
  return items.reduce((total, item) => total + item.value, 0);
}

export class ReportGenerator {
  constructor(database) {
    this.db = database;
  }

  /**
   * Gera um relatório de itens baseado no tipo e no usuário.
   * - Admins veem tudo.
   * - Users comuns só veem itens com valor <= 500.
   */
  generateReport(reportType, user, items) {
    const policy = ROLE_POLICIES[user.role] ?? new NoAccessPolicy();
    const visibleItems = items.filter((item) => policy.canView(item));
    visibleItems.forEach((item) => policy.prepare(item));

    const formatter = FORMATTERS[reportType];
    if (!formatter) {
      return '';
    }

    const rows = visibleItems.map((item) =>
      formatter.row(item, user, policy.isHighlighted(item)),
    );

    return [
      ...formatter.header(user),
      ...rows,
      ...formatter.footer(sumValues(visibleItems)),
    ].join('\n');
  }
}
