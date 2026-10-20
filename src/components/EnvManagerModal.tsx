import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { store, useEditorState } from '../editor/store';
import { pushCommand } from '../editor/commands';
import type { SceneHandle } from '../editor/scene';
import type { MudletColor } from '../mapIO';
import { RoomColorPicker } from './RoomColorPicker';

interface EnvPanelProps {
  sceneRef: { current: SceneHandle | null };
}

function mudletColorToHex(c: MudletColor): string {
  return '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToMudletColor(hex: string | null): MudletColor {
  if (hex === null) return { spec: 1, alpha: 0, r: 0, g: 0, b: 0, pad: 0 };
  return { spec: 1, alpha: 255, r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), pad: 0 };
}

export function EnvPanel({ sceneRef }: EnvPanelProps) {
  const { t } = useTranslation('envs');
  const map = useEditorState((s) => s.map);
  const dataVersion = useEditorState((s) => s.dataVersion);
  const [filter, setFilter] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [newColor, setNewColor] = useState<string | null>('#888888');

  if (!map) return <div className="modal-empty">{t('noMap')}</div>;

  const reader = sceneRef.current?.reader;
  const filterNum = filter.trim();
  const envList = Object.entries(map.mCustomEnvColors)
    .map(([id, color]) => ({ envId: Number(id), color }))
    .sort((a, b) => a.envId - b.envId)
    .filter(({ envId }) => !filterNum || String(envId).includes(filterNum))
    .map(({ envId, color }) => ({
      envId,
      transparent: color.alpha === 0,
      rgbValue: reader ? reader.getColorValue(envId) : `rgb(${color.r},${color.g},${color.b})`,
    }));

  const selectedEntry = selectedEnvId != null ? envList.find((e) => e.envId === selectedEnvId) ?? null : null;

  const handleTileClick = (envId: number) => {
    setIsAdding(false);
    setSelectedEnvId(envId === selectedEnvId ? null : envId);
  };

  const firstFreeId = () => {
    const used = new Set(Object.keys(map.mCustomEnvColors).map(Number));
    let id = 257;
    while (used.has(id)) id++;
    return id;
  };

  const handleAddTileClick = () => {
    setSelectedEnvId(null);
    setNewId(String(firstFreeId()));
    setIsAdding(true);
  };

  const handleColorChange = (envId: number, hex: string | null) => {
    const color = hexToMudletColor(hex);
    const from = map.mCustomEnvColors[envId] ?? null;
    pushCommand({ kind: 'setCustomEnvColor', envId, from, to: color }, sceneRef.current);
    sceneRef.current?.refresh();
    store.bumpData();
    store.setState({ status: t('colorUpdated', { id: envId }) });
  };

  const handleRemoveCustom = (envId: number) => {
    const from = map.mCustomEnvColors[envId];
    if (!from) return;
    pushCommand({ kind: 'setCustomEnvColor', envId, from, to: null }, sceneRef.current);
    sceneRef.current?.refresh();
    store.bumpData();
    store.setState({ status: t('customColorRemoved', { id: envId }) });
    if (selectedEnvId === envId) setSelectedEnvId(null);
  };

  const handleAdd = () => {
    const id = parseInt(newId, 10);
    if (Number.isNaN(id) || id <= 256) { store.setState({ status: t('reservedIds') }); return; }
    const color = hexToMudletColor(newColor);
    const from = map.mCustomEnvColors[id] ?? null;
    pushCommand({ kind: 'setCustomEnvColor', envId: id, from, to: color }, sceneRef.current);
    sceneRef.current?.refresh();
    store.bumpData();
    store.setState({ status: t('customEnvSet', { id, color: newColor ?? t('transparent') }) });
    setNewId('');
    setNewColor('#888888');
    setIsAdding(false);
    setSelectedEnvId(id);
  };

  return (
    <div className="panel-content">
      <div className="modal-add-row" style={{ marginBottom: 8 }}>
        <input
          className="env-filter-input"
          placeholder={t('filterPlaceholder')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="env-tile-grid">
        {envList.map(({ envId, rgbValue, transparent }) => (
          <button
            key={envId}
            type="button"
            className={`env-tile${transparent ? ' room-color-transparent' : ''}${selectedEnvId === envId ? ' selected' : ''}`}
            style={{ backgroundColor: rgbValue }}
            title={t('envTitle', { id: envId })}
            onClick={() => handleTileClick(envId)}
          >
            <span className="env-tile-id">{envId}</span>
          </button>
        ))}
        <button
          type="button"
          className={`env-tile env-tile-add${isAdding ? ' selected' : ''}`}
          title={t('addTitle')}
          onClick={handleAddTileClick}
        >
          <span className="env-tile-add-icon">+</span>
        </button>
      </div>

      {isAdding && (
        <div className="env-detail" style={{ marginTop: 12 }}>
          <p className="env-detail-id">{t('newEnv')}</p>
          <label className="env-detail-label">{t('id')}</label>
          <input
            type="number"
            placeholder={t('envIdPlaceholder')}
            value={newId}
            min={257}
            onChange={(e) => setNewId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="env-detail-input"
          />
          <label className="env-detail-label">{t('color')}</label>
          <RoomColorPicker color={newColor} onChange={setNewColor} />
          <button type="button" className="env-detail-btn" onClick={handleAdd} disabled={!newId}>
            {t('add')}
          </button>
        </div>
      )}

      {!isAdding && selectedEntry && (
        <div className="env-detail" style={{ marginTop: 12 }}>
          <div className={`env-detail-swatch${selectedEntry.transparent ? ' room-color-transparent' : ''}`} style={{ backgroundColor: selectedEntry.rgbValue }} />
          <p className="env-detail-id">Env #{selectedEntry.envId}</p>
          <label className="env-detail-label">{t('color')}</label>
          <RoomColorPicker
            color={map.mCustomEnvColors[selectedEntry.envId]!.alpha === 0
              ? null : mudletColorToHex(map.mCustomEnvColors[selectedEntry.envId]!)}
            onChange={(color) => handleColorChange(selectedEntry.envId, color)}
          />
          <button
            type="button"
            className="env-detail-btn env-detail-btn--danger"
            onClick={() => handleRemoveCustom(selectedEntry.envId)}
          >
            {t('remove')}
          </button>
        </div>
      )}

      <span style={{ display: 'none' }}>{dataVersion}</span>
    </div>
  );
}
