const CORS_PROXY = "https://corsproxy.io/?";
const steamIdCache = {};

document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

async function fetchSteamId(gameName) {
    if (steamIdCache[gameName]) return steamIdCache[gameName];
    try {
        // Limpeza aprimorada do nome para busca
        const cleanName = gameName
            .replace(/Game of the Year Edition|GOTY|Definitive Edition|Director's Cut|Gold Edition|Special Edition|Ultimate Edition|Complete Edition|Deluxe Edition/gi, '')
            .replace(/[^a-zA-Z0-9 ]/g, ' ')
            .trim();

        const response = await fetch(`${CORS_PROXY}${encodeURIComponent('https://store.steampowered.com/api/storesearch/?term=' + cleanName + '&l=brazilian&cc=BR')}`);
        const data = await response.json();
        if (data.total > 0 && data.items[0]) {
            steamIdCache[gameName] = data.items[0].id;
            return data.items[0].id;
        }
    } catch (e) { console.error("Erro busca:", gameName); }
    return null;
}

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    // Ordem das lojas conforme sua imagem
    const storeOrder = ["Steam", "Steam Family Sharing", "EA App", "Ubisoft Connect", "GOG", "Battle.net", "RobotCache", "Epic", "Amazon"];

    const grouped = gamesData.reduce((acc, game) => {
        const store = game.Fontes || "Outros";
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
            <button class="w-full flex justify-between p-4 bg-gray-900/50 rounded-xl mb-6 border border-gray-800 font-bold uppercase tracking-widest hover:bg-gray-800 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-layer-group mr-3 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${gamesInStore.map(game => {
                    const sId = game['Id do jogo'];
                    const isSteamId = sId && !isNaN(sId) && String(sId).length < 12;
                    const coverUrl = isSteamId ? `https://cdn.akamai.steamstatic.com/steam/apps/${sId}/library_600x900_2x.jpg` : null;

                    return `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative group bg-[#1e293b] border border-gray-800" 
                         onclick="openDetails('${game.Id}')" data-name="${game.Nome}" data-id="${isSteamId ? sId : ''}">
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0">
                            <span class="text-gray-500 font-bold uppercase text-[10px] tracking-tighter">${game.Nome}</span>
                        </div>
                        <img src="${coverUrl || ''}" class="game-img w-full h-full object-cover relative z-10 ${coverUrl ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500" loading="lazy" onerror="this.style.opacity='0'">
                    </div>`;
                }).join('')}
            </div>`;
        container.appendChild(section);
    });
    startImageObserver();
}

function startImageObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(async (entry, index) => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const img = card.querySelector('.game-img');
                if (img.classList.contains('opacity-100')) return;

                setTimeout(async () => {
                    const steamId = await fetchSteamId(card.getAttribute('data-name'));
                    if (steamId) {
                        img.src = `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900_2x.jpg`;
                        img.onload = () => img.classList.replace('opacity-0', 'opacity-100');
                    }
                }, index * 150); // Delay para evitar bloqueio do Proxy
                observer.unobserve(card);
            }
        });
    }, { rootMargin: "200px" });
    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

async function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;

    let sId = game['Id do jogo'];
    if (!sId || isNaN(sId)) sId = await fetchSteamId(game.Nome);

    content.innerHTML = `
        <div class="sticky top-0 z-50 bg-[#0f1219]/95 backdrop-blur-md px-8 py-6 border-b border-gray-800 flex justify-between items-start shrink-0">
            <div>
                <h2 class="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white leading-none">${game.Nome}</h2>
                <p class="text-blue-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">${game.Fontes}</p>
            </div>
            <button onclick="closeModal()" class="w-12 h-12 rounded-full bg-gray-800 hover:bg-red-500 hover:text-white text-gray-400 transition flex items-center justify-center shrink-0 ml-4"><i class="fas fa-times text-xl"></i></button>
        </div>
        <div class="modal-scroll-area p-10 h-full">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div class="space-y-6 text-sm bg-black/40 p-8 rounded-[2rem] border border-gray-800 h-fit">
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Desenvolvedor</span><br><strong class="text-white">${game.Desenvolvedores || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Lançamento</span><br><strong class="text-white">${game['Data de lançamento'] || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Gêneros</span><br><strong class="text-white">${game.Gêneros || 'N/A'}</strong></p>
                    <p><span class="text-gray-500 uppercase text-[10px] font-black tracking-widest">Classificação</span><br><strong class="text-white">${game['Classificação indicativa'] || 'N/A'}</strong></p>
                    <hr class="border-gray-800">
                    <div class="flex justify-between">
                        <div><p class="text-[10px] text-gray-500 uppercase font-bold">Crítica</p><p class="text-3xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p></div>
                        <div><p class="text-[10px] text-gray-500 uppercase font-bold">Comunidade</p><p class="text-3xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p></div>
                    </div>
                </div>
                <div class="md:col-span-2 space-y-10">
                    <div><h3 class="text-blue-500 font-black text-xs uppercase tracking-[0.4em] mb-4">Descrição</h3><p class="text-gray-300 leading-relaxed text-lg font-medium">${game.Descrição || 'Nenhuma descrição disponível.'}</p></div>
                    <div class="bg-blue-600/5 p-8 rounded-3xl border border-blue-500/20 group hover:bg-blue-600/10 transition">
                        <a href="${pcWikiLink}" target="_blank" class="flex items-center text-blue-400 font-bold uppercase text-xs tracking-widest"><i class="fas fa-microchip mr-4 text-xl"></i> Requerimentos do Sistema</a>
                    </div>
                    <div class="flex flex-wrap gap-4">
                        <a title="YouTube" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+launch+trailer" target="_blank" class="btn-icon bg-[#FF0000]"><i class="fab fa-youtube"></i></a>
                        <a title="Steam Store" href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#171a21]"><i class="fab fa-steam"></i></a>
                        <a title="SteamDB" href="https://steamdb.info/app/${sId}/" target="_blank" class="btn-icon bg-[#1b2838]"><i class="fas fa-chart-line"></i></a>
                        <a title="ProtonDB" href="https://www.protondb.com/app/${sId}" target="_blank" class="btn-icon bg-[#212121]"><i class="fab fa-linux"></i></a>
                        <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#005596]"><i class="fas fa-users"></i></a>
                        <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#212121]"><i class="fas fa-clock"></i></a>
                        <a title="Nexus Mods" href="https://www.nexusmods.com/search/?gsearch=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#da8100]"><i class="fas fa-puzzle-piece"></i></a>
                        <a title="GG Deals" href="https://gg.deals/games/?title=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#004a00]"><i class="fas fa-tag"></i></a>
                    </div>
                </div>
            </div>
            <div class="h-20"></div>
        </div>`;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}