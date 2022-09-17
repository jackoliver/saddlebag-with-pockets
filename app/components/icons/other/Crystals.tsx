import Icon from './svg/ItemCategory_Crystal.svg'
import { FC } from 'react'

type Props = {
  className?: string
}

export const Crystals: FC<Props> = ({ className = '' }) => {
  // @ts-ignore
  return <Icon className={className} />
}
