import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import { TALENTS_DRUID } from 'common/TALENTS';
import SPELLS from 'common/SPELLS';
import Events, { DamageEvent } from 'parser/core/Events';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import Statistic from 'parser/ui/Statistic';
import ItemPercentDamageDone from 'parser/ui/ItemPercentDamageDone';
import BoringSpellValueText from 'parser/ui/BoringSpellValueText';
import { SpellLink } from 'interface';
import { formatPercentage } from 'common/format';
import { isConvoking } from 'analysis/retail/druid/shared/spells/ConvokeSpirits';

const BUFFER_MS = 50;

/**
 * **Rampant Ferocity**
 * Spec Talent
 *
 * Ferocious Bite hits all nearby enemies affected by your Rip for 35% of the damage dealt.
 * Damage reduced beyond 5 target.
 */
class RampantFerocity extends Analyzer {
  totalBiteHits: number = 0;
  totalRampantFerocityHits: number = 0;

  hardcastRfDamage: number = 0;
  apexRfDamage: number = 0;
  convokeRfDamage: number = 0;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_DRUID.RAMPANT_FEROCITY_TALENT);
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.FEROCIOUS_BITE),
      this.onFbDamage,
    );
    this.addEventListener(
      Events.damage.by(SELECTED_PLAYER).spell(SPELLS.RAMPANT_FEROCITY),
      this.onRfDamage,
    );
  }

  onFbDamage(event: DamageEvent) {
    this.totalBiteHits += 1;
  }

  onRfDamage(event: DamageEvent) {
    this.totalRampantFerocityHits += 1;

    const amount = event.amount + (event.absorbed || 0);
    if (isConvoking(this.selectedCombatant)) {
      this.convokeRfDamage += amount;
    } else if (
      this.selectedCombatant.hasBuff(
        SPELLS.APEX_PREDATORS_CRAVING_BUFF.id,
        event.timestamp,
        BUFFER_MS,
      )
    ) {
      this.apexRfDamage += amount;
    } else {
      this.hardcastRfDamage += amount;
    }
  }

  get totalDamage() {
    return this.hardcastRfDamage + this.apexRfDamage + this.convokeRfDamage;
  }

  get avgTargetsHit() {
    return this.totalBiteHits === 0 ? 0 : this.totalRampantFerocityHits / this.totalBiteHits;
  }

  _formattedPercentDamage(amount: number) {
    return (
      <strong>{formatPercentage(this.owner.getPercentageOfTotalDamageDone(amount), 2)}%</strong>
    );
  }

  statistic() {
    const hasApex = this.selectedCombatant.hasTalent(TALENTS_DRUID.APEX_PREDATORS_CRAVING_TALENT);
    const hasConvoke = this.selectedCombatant.hasTalent(TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT);
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(4)} // number based on talent row
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
        tooltip={
          <>
            Average splash hits per Bite: <strong>{this.avgTargetsHit.toFixed(1)}</strong>
            <br />
            {(hasApex || hasConvoke) && (
              <>
                Breakdown per Bite source:
                <ul>
                  <li>Hardcast: {this._formattedPercentDamage(this.hardcastRfDamage)}</li>
                  {hasApex && (
                    <li>
                      <SpellLink id={TALENTS_DRUID.APEX_PREDATORS_CRAVING_TALENT.id} />:{' '}
                      {this._formattedPercentDamage(this.apexRfDamage)}
                    </li>
                  )}
                  {hasConvoke && (
                    <li>
                      <SpellLink id={TALENTS_DRUID.CONVOKE_THE_SPIRITS_TALENT.id} />:{' '}
                      {this._formattedPercentDamage(this.convokeRfDamage)}
                    </li>
                  )}
                </ul>
              </>
            )}
          </>
        }
      >
        <BoringSpellValueText spellId={TALENTS_DRUID.RAMPANT_FEROCITY_TALENT.id}>
          <ItemPercentDamageDone amount={this.totalDamage} />
        </BoringSpellValueText>
      </Statistic>
    );
  }
}

export default RampantFerocity;
