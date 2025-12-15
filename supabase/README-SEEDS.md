# Seeds do Banco de Dados

## Como Executar os Seeds

Execute os arquivos SQL no Supabase SQL Editor na seguinte ordem:

### 1. Schemas Base
1. `schema.sql` - Schema principal do banco
2. `fase2-schema-updates.sql` - Atualizações da Fase 2
3. `fase3-support-schema.sql` - Schema de suporte
4. `fase3-sales-schema.sql` - Schema de vendas

### 2. Seeds
1. `seed-products.sql` - Produtos/serviços iniciais

## Seed de Produtos

O arquivo `seed-products.sql` contém:

- **Consultas Médicas**: 10 especialidades diferentes
- **Exames**: 10 tipos de exames laboratoriais e de imagem
- **Pacotes**: 6 pacotes de check-up e saúde
- **Outros Serviços**: 8 serviços adicionais (atestados, laudos, etc.)

### Categorias de Produtos

- `consultation` - Consultas médicas
- `exam` - Exames laboratoriais e de imagem
- `package` - Pacotes de serviços
- `other` - Outros serviços

### Preços

Os preços estão em Reais (BRL) e variam de R$ 25,00 a R$ 680,00, dependendo do tipo de serviço.

## Verificação

Após executar o seed, você pode verificar os produtos inseridos:

```sql
SELECT COUNT(*) as total_produtos FROM products WHERE active = true;
SELECT category, COUNT(*) as quantidade FROM products GROUP BY category;
```

## Personalização

Você pode modificar os produtos no arquivo `seed-products.sql` antes de executar, ou adicionar novos produtos diretamente no Supabase após a execução inicial.

