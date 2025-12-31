// Configurações
const CORS_PROXY = "https://corsproxy.io/?";
const SGDB_API_KEY = "c1c6a611af8537dfde7babca64617fa4";
const sgdbCache = {}; // Cache para imagens do SteamGridDB

document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

// Função de Limpeza Simplificada (Corta no primeiro símbolo)
function cleanGameName(name) {
    // Corta a string no primeiro :, -, _ ou ( que encontrar
    return name.split(/[:\-(_]/)[0].trim();
}

// Busca Imagem no SteamGridDB (Apenas para jogos sem SteamID)
async function fetchSGDBImage(gameName) {
    if (sgdbCache[gameName]) return sgdbCache[gameName];

    try {
        const simpleName = cleanGameName(gameName);
        
        // 1. Busca o ID do jogo no SGDB
        const searchUrl = `${CORS_PROXY}https://www.steamgriddb.com/api/v2/search/by/name/${encodeURIComponent(simpleName)}`;
        const searchResponse = await fetch(searchUrl, {
            headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
        });
        const searchData = await searchResponse.json();

        if (searchData.success && searchData.data.length > 0) {
            const sgdbId = searchData.data[0].id; // Pega o primeiro resultado

            // 2. Busca as capas (grids) verticais
            const gridUrl = `${CORS_PROXY}https://www.steamgriddb.com/api/v2/grids/game/${sgdbId}?dimensions=600x900`;
            const gridResponse = await fetch(gridUrl, {
                headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
            });
            const gridData = await gridResponse.json();

            if (gridData.success && gridData.data.length > 0) {
                const imageUrl = gridData.data[0].url; // Pega a primeira imagem
                sgdbCache[gameName] = imageUrl;
                return imageUrl;
            }
        }
    } catch (e) {
        console.error(`Erro SGDB para ${gameName}:`, e);
    }
    return null;
}

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    const storeOrder = [
        "Steam", "Steam Family Sharing", "Epic", "Epic Games", "EA App", 
        "Ubisoft Connect", "GOG", "Battle.net", "Amazon Games", "Amazon", "RobotCache"
    ];

    const grouped = gamesData.reduce((acc, game) => {
        const store = (game.Fontes || "Outros").trim();
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let idxA = storeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
        let idxB = storeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
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
                    const steamId = game.SteamID;
                    // Se tem ID, usa Steam. Se não, deixa vazio para o Observer preencher com SGDB.
                    const hasSteamId = steamId && !isNaN(steamId);
                    const coverUrl = hasSteamId 
                        ? `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900_2x.jpg` 
                        : '';

                    return `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative group bg-[#1e293b] border border-gray-800" 
                         onclick="openDetails('${game.Nome.replace(/'/g, "\\'")}')"
                         data-name="${game.Nome}"
                         data-steamid="${hasSteamId ? steamId : ''}">
                        
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0">
                            <span class="text-gray-500 font-bold uppercase text-[10px] tracking-tighter">${game.Nome}</span>
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

function startImageObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const img = card.querySelector('.game-img');
                const gameName = card.getAttribute('data-name');
                const hasSteamId = card.getAttribute('data-steamid');

                // Se NÃO tem SteamID e a imagem está oculta, busca no SGDB
                if (!hasSteamId && img.classList.contains('opacity-0')) {
                    // Pequeno delay escalonado para não sobrecarregar a API
                    setTimeout(async () => {
                        const sgdbUrl = await fetchSGDBImage(gameName);
                        if (sgdbUrl) {
                            img.src = sgdbUrl;
                            img.onload = () => img.classList.replace('opacity-0', 'opacity-100');
                        }
                    }, index * 100);
                } 
                // Se já tem link da Steam (setado no render), só garante o fade-in
                else if (img.src && img.complete && img.naturalHeight !== 0) {
                    img.classList.replace('opacity-0', 'opacity-100');
                }
                
                observer.unobserve(card);
            }
        });
    }, { rootMargin: "300px" });

    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

// Modal atualizado para usar os dados do JSON Ids.json (que tem campos limitados)
// Nota: Como o novo JSON tem menos dados, alguns campos como 'Descrição' ficarão genéricos se não existirem
function openDetails(gameName) {
    // Busca pelo nome pois o ID não é único (null) para todos
    const game = gamesData.find(g => g.Nome === gameName);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;
    const sId = game.SteamID;

    content.innerHTML = `
        <div class="sticky top-0 z-50 bg-[#0f1219]/95 backdrop-blur-md px-8 py-6 border-b border-gray-800 flex justify-between items-start shrink-0 shadow-lg">
            <div>
                <h2 class="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white leading-none">
                    ${game.Nome}
                </h2>
                <p class="text-blue-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">${game.Fontes || 'N/A'}</p>
            </div>
            <button onclick="closeModal()" class="w-12 h-12 rounded-full bg-gray-800 hover:bg-red-500 hover:text-white text-gray-400 transition flex items-center justify-center shrink-0 ml-4">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>

        <div class="overflow-y-auto p-10 h-full">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="space-y-6 text-sm bg-black/40 p-8 rounded-[2rem] border border-gray-800 h-fit">
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Desenvolvedor</span><br><strong class="text-white">${game.Desenvolvedores || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Lançamento</span><br><strong class="text-white">${game['Data de lançamento'] || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Gêneros</span><br><strong class="text-white">${game.Gêneros || 'N/A'}</strong></p>
                    
                    <hr class="border-gray-800">
                    
                    <div class="flex justify-between">
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase font-bold">Crítica</p>
                            <p class="text-3xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase font-bold">Comunidade</p>
                            <p class="text-3xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p>
                        </div>
                    </div>
                </div>

                <div class="md:col-span-2 space-y-10">
                    <div>
                        <h3 class="text-blue-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Descrição</h3>
                        <p class="text-gray-300 leading-relaxed text-lg font-medium">${game.Descrição || 'Nenhuma descrição disponível.'}</p>
                    </div>

                    <div class="bg-blue-600/5 p-8 rounded-3xl border border-blue-500/20 group hover:bg-blue-600/10 transition">
                        <a href="${pcWikiLink}" target="_blank" class="flex items-center text-blue-400 font-bold uppercase text-xs tracking-widest">
                            <i class="fas fa-microchip mr-4 text-xl"></i> Requerimentos do Sistema
                        </a>
                    </div>

                    <div class="flex flex-wrap gap-4 pt-4">
                        <a title="YouTube" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+launch+trailer" target="_blank" class="btn-icon bg-[#FF0000]"><i class="fab fa-youtube"></i></a>
                        <a title="Steam Store" href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#171a21]"><i class="fab fa-steam"></i></a>
                        
                        ${sId ? `<a title="SteamDB" href="https://steamdb.info/app/${sId}/" target="_blank" class="btn-icon bg-[#1b2838]"><i class="fas fa-chart-line"></i></a>` : ''}
                        ${sId ? `<a title="ProtonDB" href="https://www.protondb.com/app/${sId}" target="_blank" class="btn-icon bg-[#212121]"><i class="fab fa-linux"></i></a>` : ''}
                        
                        <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#005596]"><i class="fas fa-users"></i></a>
                        <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#212121]"><i class="fas fa-clock"></i></a>
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