// Configuração SteamGridDB (Fallback)
const CORS_PROXY = "https://corsproxy.io/?";
const SGDB_API_KEY = "c1c6a611af8537dfde7babca64617fa4"; 
const sgdbCache = {}; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Limpa e Sincroniza os IDs
    mergeGameData();
    
    // 2. Renderiza a tela
    renderLibrary();
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

/**
 * 1. Limpa qualquer lixo no 'Id do jogo'
 * 2. Injeta o valor exato do ids.js (incluindo "null")
 */
function mergeGameData() {
    // Verifica se as variáveis globais existem
    if (typeof idsData === 'undefined' || typeof gamesData === 'undefined') {
        console.error("ERRO: Certifique-se de que ids.js (com a variável idsData) e games_data.js foram carregados.");
        return;
    }

    // Cria mapa de referência: Nome -> Id do jogo (do arquivo ids.js)
    const idsMap = {};
    idsData.forEach(item => {
        // Usa o nome exato como chave e pega a propriedade correta ["Id do jogo"]
        if (item.Nome) {
            idsMap[item.Nome] = item["Id do jogo"];
        }
    });

    console.log(`Mapa de IDs carregado com ${Object.keys(idsMap).length} jogos.`);

    // Processa a lista principal
    gamesData.forEach(game => {
        // PASSO 1: Apaga a linha id de jogo (Reseta para "null")
        // Isso garante que IDs antigos/errados sejam removidos antes de tentar achar o novo
        game['Id do jogo'] = "null";

        // PASSO 2: Encontra no arquivo ids o id correspondente e substitui
        // A busca é feita pelo nome exato (sem trim ou lowerCase, conforme solicitado)
        if (idsMap.hasOwnProperty(game.Nome)) {
            game['Id do jogo'] = idsMap[game.Nome];
        }
    });
    
    console.log("Merge concluído. IDs atualizados.");
}

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    const storeOrder = ["Steam", "Steam Family Sharing", "Epic", "Epic Games", "EA App", "Ubisoft Connect", "GOG", "Battle.net", "Amazon Games", "Amazon", "RobotCache"];

    // Agrupa e Ordena
    const grouped = gamesData.reduce((acc, game) => {
        const store = (game.Fontes || "Outros").trim();
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let idxA = storeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
        let idxB = storeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
    });

    sortedStores.forEach(store => {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        if (gamesInStore.length === 0) return;

        const section = document.createElement('div');
        section.className = 'mb-12';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900/50 rounded-xl mb-6 border border-gray-800 font-bold uppercase tracking-widest hover:bg-gray-800 transition" 
                    onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-layer-group mr-3 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${gamesInStore.map(game => {
                    const finalId = game['Id do jogo'];
                    
                    // Verifica se é um SteamID válido:
                    // - Deve existir
                    // - Não pode ser a string "null"
                    // - Deve ser um número
                    const isSteamId = finalId && finalId !== "null" && !isNaN(finalId);
                    
                    // Se for SteamID válido, usa CDN da Steam. Se não (é "null"), deixa vazio para o Observer buscar no SGDB.
                    const coverUrl = isSteamId 
                        ? `https://cdn.akamai.steamstatic.com/steam/apps/${finalId}/library_600x900_2x.jpg` 
                        : '';
                    
                    const safeName = game.Nome.replace(/'/g, "\\'");

                    return `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative group bg-[#1e293b] border border-gray-800" 
                         onclick="openDetails('${safeName}')"
                         data-name="${game.Nome}"
                         data-is-steam="${isSteamId}">
                        
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0">
                            <span class="text-gray-600 font-bold uppercase text-[10px] tracking-tighter">${game.Nome}</span>
                        </div>

                        <img src="${coverUrl}" 
                             class="game-img w-full h-full object-cover relative z-10 ${coverUrl ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500" 
                             loading="lazy" 
                             onerror="this.style.opacity='0'">
                    </div>`;
                }).join('')}
            </div>
        `;
        container.appendChild(section);
    });

    startImageObserver();
}

// --- FALLBACK (SGDB para quem é null) ---

function cleanGameName(name) {
    if (!name) return "";
    return name.split(/[:\-_(]/)[0].trim();
}

async function fetchSGDBImage(gameName) {
    if (sgdbCache[gameName]) return sgdbCache[gameName];
    try {
        const simpleName = cleanGameName(gameName);
        console.log(`Buscando SGDB para: ${simpleName}`);
        
        const searchRes = await fetch(`${CORS_PROXY}https://www.steamgriddb.com/api/v2/search/by/name/${encodeURIComponent(simpleName)}`, {
            headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
        });
        
        if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.success && searchData.data.length > 0) {
                const gameId = searchData.data[0].id;
                const gridRes = await fetch(`${CORS_PROXY}https://www.steamgriddb.com/api/v2/grids/game/${gameId}?dimensions=600x900`, {
                    headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
                });
                
                if (gridRes.ok) {
                    const gridData = await gridRes.json();
                    if (gridData.success && gridData.data.length > 0) {
                        const url = gridData.data[0].url;
                        sgdbCache[gameName] = url;
                        return url;
                    }
                }
            }
        }
    } catch (e) { console.warn("SGDB falhou:", gameName); }
    return null;
}

function startImageObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const img = card.querySelector('.game-img');
                const gameName = card.getAttribute('data-name');
                const isSteam = card.getAttribute('data-is-steam') === 'true';

                // Se NÃO é Steam (ou seja, ID era "null" ou inválido), busca no SGDB
                if (!isSteam && img.classList.contains('opacity-0')) {
                    setTimeout(async () => {
                        const newUrl = await fetchSGDBImage(gameName);
                        if (newUrl) {
                            img.src = newUrl;
                            img.onload = () => img.classList.replace('opacity-0', 'opacity-100');
                        }
                    }, index * 100);
                } 
                // Se É Steam, apenas garante o fade-in quando carregar
                else if (isSteam) {
                    img.onload = () => img.classList.replace('opacity-0', 'opacity-100');
                    if (img.complete) img.classList.replace('opacity-0', 'opacity-100');
                }
                observer.unobserve(card);
            }
        });
    }, { rootMargin: "300px" });
    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

// --- MODAL ---

function openDetails(gameName) {
    const game = gamesData.find(g => g.Nome === gameName);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const steamId = game['Id do jogo']; // Já sincronizado
    
    // Links
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;
    
    // Se ID for válido (não é null string e é número), gera link do app
    const isSteamId = steamId && steamId !== "null" && !isNaN(steamId);
    
    const steamStoreLink = isSteamId ? `https://store.steampowered.com/app/${steamId}` : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}`;

    content.innerHTML = `
        <div class="sticky top-0 z-50 bg-[#0f1219]/95 backdrop-blur-md px-8 py-6 border-b border-gray-800 flex justify-between items-start shrink-0 shadow-lg">
            <div>
                <h2 class="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white leading-none">${game.Nome}</h2>
                <p class="text-blue-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">${game.Fontes || 'Outros'}</p>
            </div>
            <button onclick="closeModal()" class="w-12 h-12 rounded-full bg-gray-800 hover:bg-red-500 hover:text-white text-gray-400 transition flex items-center justify-center shrink-0 ml-4"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="overflow-y-auto p-8 md:p-12 h-full">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="space-y-6 text-sm bg-black/40 p-8 rounded-[2rem] border border-gray-800 h-fit">
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Desenvolvedor</span><br><strong class="text-white">${game.Desenvolvedores || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Lançamento</span><br><strong class="text-white">${game['Data de lançamento'] || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Gêneros</span><br><strong class="text-white">${game.Gêneros || 'N/A'}</strong></p>
                    <hr class="border-gray-800">
                    <div class="flex justify-between">
                        <div><p class="text-[10px] text-gray-500 uppercase font-bold">Crítica</p><p class="text-3xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p></div>
                        <div><p class="text-[10px] text-gray-500 uppercase font-bold">User</p><p class="text-3xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p></div>
                    </div>
                </div>
                <div class="md:col-span-2 space-y-10">
                    <div><h3 class="text-blue-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Descrição</h3><p class="text-gray-300 leading-relaxed text-lg font-medium">${game.Descrição || 'Descrição não disponível.'}</p></div>
                    <div class="bg-blue-600/5 p-8 rounded-3xl border border-blue-500/20 group hover:bg-blue-600/10 transition">
                        <a href="${pcWikiLink}" target="_blank" class="flex items-center text-blue-400 font-bold uppercase text-xs tracking-widest no-underline"><i class="fas fa-microchip mr-4 text-xl"></i> Requerimentos do Sistema</a>
                    </div>
                    <div class="flex flex-wrap gap-4 pt-4">
                        <a title="YouTube Trailer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+trailer" target="_blank" class="btn-icon bg-[#FF0000]"><i class="fab fa-youtube"></i></a>
                        <a title="Steam Store" href="${steamStoreLink}" target="_blank" class="btn-icon bg-[#171a21]"><i class="fab fa-steam"></i></a>
                        ${isSteamId ? `<a title="SteamDB" href="https://steamdb.info/app/${steamId}/" target="_blank" class="btn-icon bg-[#1b2838]"><i class="fas fa-chart-line"></i></a>` : ''}
                        ${isSteamId ? `<a title="ProtonDB" href="https://www.protondb.com/app/${steamId}" target="_blank" class="btn-icon bg-[#212121]"><i class="fab fa-linux"></i></a>` : ''}
                        <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#005596]"><i class="fas fa-users"></i></a>
                        <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#E64A19]"><i class="fas fa-clock"></i></a>
                        <a title="Nexus Mods" href="https://www.nexusmods.com/search/?gsearch=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#da8100]"><i class="fas fa-puzzle-piece"></i></a>
                        <a title="GG Deals" href="https://gg.deals/games/?title=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#004a00]"><i class="fas fa-tag"></i></a>
                    </div>
                </div>
            </div>
            <div class="h-20"></div>
        </div>
    `;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}