const express = require('express');
const { createClient } = require('redis');

const app = express();
const PORT = 3000;

// Configuração e conexão do cliente Redis
const redisClient = createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Erro no Redis:', err));

// Simulação de uma consulta lenta à Base de Dados (demora 2 segundos)
async function buscarProdutosNoBancoDeDados() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, nome: 'Portátil Pro', preco: 1200 },
                { id: 2, nome: 'Teclado Mecânico', preco: 100 },
                { id: 3, nome: 'Monitor 4K', preco: 350 }
            ]);
        }, 2000);
    });
}

// Rota da API com Cache Redis
app.get('/produtos', async (req, res) => {
    const chaveCache = 'lista:produtos';
    console.time('Tempo de Resposta');

    try {
        // 1. Tenta obter os dados diretamente do Redis
        const produtosEmCache = await redisClient.get(chaveCache);

        if (produtosEmCache) {
            console.timeEnd('Tempo de Resposta');
            return res.json({
                origem: 'Cache Redis (Ultra Rápido)',
                dados: JSON.parse(produtosEmCache)
            });
        }

        // 2. Se não existir no Redis, consulta a "Base de Dados"
        const produtos = await buscarProdutosNoBancoDeDados();

        // 3. Guarda no Redis com expiração (TTL) de 30 segundos
        await redisClient.setEx(chaveCache, 30, JSON.stringify(produtos));

        console.timeEnd('Tempo de Resposta');
        return res.json({
            origem: 'Base de Dados Principal (Lento - 2s)',
            dados: produtos
        });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro interno no servidor' });
    }
});

// Inicialização do servidor
redisClient.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor a correr em http://localhost:${PORT}`);
    });
});
