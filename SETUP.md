# Guia de Configuração do Firebase

## Como Inicializar os Dados no Firebase

### Opção 1: Execução Manual
1. Abra o arquivo `setup-firebase-data.html` no seu navegador
2. Clique no botão "Inicializar Dados"
3. Aguarde a confirmação de sucesso no log

### Opção 2: Execução Automática
1. Abra o arquivo com o parâmetro `?auto=true`:
   - Exemplo: `file:///caminho/para/setup-firebase-data.html?auto=true`
   - Ou hospede em um servidor: `http://localhost:8080/setup-firebase-data.html?auto=true`
2. Os dados serão inseridos automaticamente após 1 segundo

### Opção 3: Através do GitHub Pages
Se o repositório estiver publicado no GitHub Pages:
1. Acesse: `https://debora1832.github.io/Checklist-inspe-o-/setup-firebase-data.html?auto=true`
2. Os dados serão inseridos automaticamente

## Dados que Serão Inseridos

### Peças
- **597-2445#01** - Peça de Teste 1
  - 5 itens de checklist (dimensões, acabamento, furos, rosca, tolerâncias)
- **597-2435#o1** - Peça de Teste 2
  - 4 itens de checklist (inspeção visual, medidas, marcação, tratamento térmico)

### Inspetores
Todos com PIN: **1234**
- João Silva
- Maria Santos
- Pedro Costa
- Ana Oliveira
- Carlos Pereira
- Luisa Ferreira
- Roberto Alves
- Fernanda Lima

### Configuração Admin
- Senha: **admin123**

## Após a Inicialização

Depois de executar o script de setup, você pode usar o sistema principal (`index.html`):
- Login como Admin: use a senha `admin123`
- Login como Inspetor: selecione qualquer inspetor e use o PIN `1234`

## Observações

- O script pode ser executado múltiplas vezes (irá adicionar dados duplicados)
- Para limpar os dados, use o console do Firebase
- Certifique-se de que as regras de segurança do Firestore permitem escrita anônima (apenas para desenvolvimento)
