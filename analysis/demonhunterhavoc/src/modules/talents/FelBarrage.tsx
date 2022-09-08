import { formatThousands } from 'common/format';
import DH_SPELLS from 'common/SPELLS/demonhunter';
import DH_TALENTS from 'common/SPELLS/talents/demonhunter';
import { SpellLink } from 'interface';
import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { CastEvent, DamageEvent } from 'parser/core/Events';
import { ThresholdStyle, When } from 'parser/core/ParseResults';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';

/**
 * Example Report: https://www.warcraftlogs.com/reports/Mz8cTFgNkxXaJt3j/#fight=4&source=18
 */

class FelBarrage extends Analyzer {
  damage = 0;
  casts = 0;
  badCasts = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(DH_TALENTS.FEL_BARRAGE_TALENT.id);
    if (!this.active) {
      return;
    }
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(DH_SPELLS.FEL_BARRAGE_DAMAGE),
      this.felBarrage,
    );
    this.addEventListener(
      Events.cast.by(SELECTED_PLAYER).spell(DH_TALENTS.FEL_BARRAGE_TALENT),
      this.felBarrageCasts,
    );
  }

  get suggestionThresholds() {
    return {
      actual: this.badCasts,
      isGreaterThan: {
        minor: 0,
        average: 0,
        major: 1,
      },
      style: ThresholdStyle.NUMBER,
    };
  }

  felBarrage(event: DamageEvent) {
    this.damage += event.amount;
  }

  felBarrageCasts(event: CastEvent) {
    this.casts += 1;

    const hasMetaBuff = this.selectedCombatant.hasBuff(
      DH_SPELLS.METAMORPHOSIS_HAVOC_BUFF.id,
      event.timestamp,
    );

    if (!hasMetaBuff) {
      this.badCasts += 1;
    }
  }

  suggestions(when: When) {
    when(this.suggestionThresholds).addSuggestion((suggest, actual, recommended) =>
      suggest(
        <>
          Try to cast <SpellLink id={DH_TALENTS.FEL_BARRAGE_TALENT.id} /> during{' '}
          <SpellLink id={DH_SPELLS.METAMORPHOSIS_HAVOC.id} />.
        </>,
      )
        .icon(DH_TALENTS.FEL_BARRAGE_TALENT.icon)
        .actual(
          <>
            {actual} bad <SpellLink id={DH_TALENTS.FEL_BARRAGE_TALENT.id} /> casts without{' '}
            <SpellLink id={DH_SPELLS.METAMORPHOSIS_HAVOC.id} />.
          </>,
        )
        .recommended(`No bad casts is recommended.`),
    );
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(6)}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            A bad cast is casting Fel Barage without Metamorphosis up.
            <br />
            <br />
            {formatThousands(this.damage)} total damage
          </>
        }
      >
        <BoringSpellValueText spellId={DH_TALENTS.FEL_BARRAGE_TALENT.id}>
          <>
            {this.badCasts}{' '}
            <small>
              casts without <SpellLink id={DH_SPELLS.METAMORPHOSIS_HAVOC.id} />{' '}
            </small>{' '}
            <br />
            {this.owner.formatItemDamageDone(this.damage)}
          </>
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default FelBarrage;
