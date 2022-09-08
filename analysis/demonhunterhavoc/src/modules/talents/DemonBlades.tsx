import { t } from '@lingui/macro';
import { formatPercentage, formatThousands } from 'common/format';
import DH_SPELLS from 'common/SPELLS/demonhunter';
import DH_TALENTS from 'common/SPELLS/talents/demonhunter';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { DamageEvent, ResourceChangeEvent } from 'parser/core/Events';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

/**
 * Example Report: https://www.warcraftlogs.com/reports/4GR2pwAYW8KtgFJn/#fight=6&source=18
 */
class DemonBlades extends Analyzer {
  furyGain = 0;
  furyWaste = 0;
  damage = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(DH_TALENTS.DEMON_BLADES_TALENT.id);
    if (!this.active) {
      return;
    }
    this.addEventListener(
      Events.resourcechange.by(SELECTED_PLAYER).spell(DH_SPELLS.DEMON_BLADES_FURY),
      this.onEnergizeEvent,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(DH_SPELLS.DEMON_BLADES_FURY),
      this.onDamageEvent,
    );
  }

  get furyPerMin() {
    return ((this.furyGain - this.furyWaste) / (this.owner.fightDuration / 60000)).toFixed(2);
  }

  get suggestionThresholds() {
    return {
      actual: this.furyWaste / this.furyGain,
      isGreaterThan: {
        minor: 0.03,
        average: 0.07,
        major: 0.1,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  onEnergizeEvent(event: ResourceChangeEvent) {
    this.furyGain += event.resourceChange;
    this.furyWaste += event.waste;
  }

  onDamageEvent(event: DamageEvent) {
    this.damage += event.amount;
  }

  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          {' '}
          Be mindful of your Fury levels and spend it before capping your Fury due to{' '}
          <SpellLink id={DH_TALENTS.DEMON_BLADES_TALENT.id} />.
        </>,
      )
        .icon(DH_TALENTS.DEMON_BLADES_TALENT.icon)
        .actual(
          t({
            id: 'demonhunter.havoc.suggestions.demonBlades.furyWasted',
            message: `${formatPercentage(actual)}% Fury wasted`,
          }),
        )
        .recommended(`${formatPercentage(recommended)}% is recommended.`),
    );
  }

  statistic() {
    const effectiveFuryGain = this.furyGain - this.furyWaste;
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(6)}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            {formatThousands(this.damage)} Total damage
            <br />
            {effectiveFuryGain} Effective Fury gained
            <br />
            {this.furyGain} Total Fury gained
            <br />
            {this.furyWaste} Fury wasted
          </>
        }
      >
        <BoringSpellValueText spellId={DH_TALENTS.DEMON_BLADES_TALENT.id}>
          <>
            {this.furyPerMin} <small>Fury per min</small> <br />
            {this.owner.formatItemDamageDone(this.damage)}
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default DemonBlades;
