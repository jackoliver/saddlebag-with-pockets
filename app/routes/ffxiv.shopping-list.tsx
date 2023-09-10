import { TrashIcon } from '@heroicons/react/solid'
import type { ActionFunction } from '@remix-run/cloudflare'
import { json } from '@remix-run/cloudflare'
import { useActionData, useNavigation } from '@remix-run/react'
import { useCallback, useState } from 'react'
import { PageWrapper } from '~/components/Common'
import DebouncedSelectInput from '~/components/Common/DebouncedSelectInput'
import TitleTooltip from '~/components/Common/TitleTooltip'
import SmallTable from '~/components/WoWResults/FullScan/SmallTable'
import SmallFormContainer from '~/components/form/SmallFormContainer'
import { SubmitButton } from '~/components/form/SubmitButton'
import Select from '~/components/form/select'
import type { ColumnList } from '~/components/types'
import { dOHOptions } from '~/consts'
import type {
  ShoppingInputItem,
  GetShoppingListResponse,
  ShoppingListItem
} from '~/requests/FFXIV/shopping-list'
import GetShoppingList from '~/requests/FFXIV/shopping-list'
import { getUserSessionData } from '~/sessions'
import { getItemIDByName } from '~/utils/items'
import { ffxivItemsList } from '~/utils/items/id_to_item'

const FORM_DEFAULTS = {
  craft_amount: 1,
  hq: true,
  job: 8
}

const FORM_NAME = 'shopping-list'

type ShoppingFormItem = ShoppingInputItem & { name: string }
type ActionDataResponse = GetShoppingListResponse | { exception: string } | {}

export const action: ActionFunction = async ({ request }) => {
  const formData = (await request.formData()).get(FORM_NAME)
  if (!formData || typeof formData !== 'string') {
    return json({ exception: 'Input not found' })
  }
  try {
    const shoppingList = JSON.parse(formData)
    const session = await getUserSessionData(request)

    const homeServer = session.getWorld()

    return GetShoppingList({ shoppingList, homeServer })
  } catch {
    return json({ exception: 'Invalid form data.' })
  }
}

export default function Index() {
  const navigation = useNavigation()
  const actionData = useActionData<ActionDataResponse>()
  const error =
    actionData && 'exception' in actionData ? actionData.exception : undefined
  const loading = navigation.state === 'submitting'

  const results = actionData && 'data' in actionData ? actionData : undefined

  console.log('actionData', actionData)

  return (
    <PageWrapper>
      <ShoppingListForm error={error} loading={loading} />
      {results && <Results {...results} />}
    </PageWrapper>
  )
}

const Results = ({ data }: GetShoppingListResponse) => {
  return (
    <>
      <div className="h-4 w-full" />
      <SmallTable
        data={data}
        sortingOrder={[{ id: 'pricePerUnit', desc: true }]}
        columnList={columnList}
        mobileColumnList={columnList}
        columnSelectOptions={['pricePerUnit', 'quantity']}
      />
    </>
  )
}

const columnList: Array<ColumnList<ShoppingListItem>> = [
  { columnId: 'name', header: 'Item Name' },
  { columnId: 'pricePerUnit', header: 'Price Per Unit' },
  { columnId: 'quantity', header: 'Quantity' },
  { columnId: 'worldName', header: 'World' },
  {
    columnId: 'hq',
    header: 'High Quality',
    accessor: ({ getValue }) => {
      return <p>{getValue() === true ? 'Yes' : ''}</p>
    }
  }
]

const Row = ({
  name,
  craft_amount,
  hq,
  job,
  itemID,
  error,
  onClick,
  updateRow
}: ShoppingFormItem & {
  onClick: (id: number | string) => void
  error?: boolean
  updateRow: (row: ShoppingFormItem) => void
}) => {
  const form = { name, hq, job, itemID, craft_amount }
  return (
    <tr
      className={`px-4 py-2 my-3 mx-1 dark:text-gray-100${
        error
          ? ' shadow-[0px_0px_4px_2px_rgba(0,0,0,0.3)] shadow-red-500 rounded dark:text-gray-100 dark:bg-gray-600 dark:placeholder-gray-400'
          : ''
      }`}>
      <TableCell>{name}</TableCell>
      <TableCell>
        <input
          className="w-[70px] border border-gray-300 rounded-md dark:border-gray-400 dark:bg-gray-600"
          type={'number'}
          value={craft_amount}
          onChange={(e) => {
            const value = e.target.value

            if (value === undefined || value === null) return

            updateRow({ ...form, craft_amount: parseInt(value, 10) })
          }}
        />
      </TableCell>
      <TableCell>
        <input
          type="checkbox"
          checked={form.hq}
          onChange={(e) => {
            const checked = e.target.checked
            if (checked === undefined || checked === null) return
            updateRow({ ...form, hq: checked })
          }}
        />
      </TableCell>
      <TableCell>
        <Select
          options={dOHOptions}
          value={form.job}
          onChange={(e) => {
            const value = e.target.value
            if (value === undefined || value === null) return

            updateRow({ ...form, job: parseInt(value) })
          }}
          className="min-w-[100px]"
        />
      </TableCell>
      <TableCell>
        <SubmitButton
          type="button"
          onClick={() => {
            onClick(itemID)
          }}>
          <TrashIcon className={`h-4 w-4 mx-auto text-white`} />
        </SubmitButton>
      </TableCell>
    </tr>
  )
}
const TableCell = ({ children }: { children: React.ReactNode }) => {
  return <td className="text-center min-w-[80px]">{children}</td>
}

const TableHead = ({ children }: { children: React.ReactNode }) => {
  return <th className="text-center">{children}</th>
}

const ShoppingListForm = ({
  error,
  loading
}: {
  error?: string
  loading: boolean
}) => {
  const [shoppingList, setShoppingList] = useState<Array<ShoppingFormItem>>([])
  const disableList = shoppingList.length >= 10

  const handleSelect = useCallback(
    (name: string) => {
      if (disableList) {
        return
      }

      const itemID = getItemIDByName(name)

      if (
        !itemID ||
        shoppingList.find((item) => item.itemID.toString() === itemID)
      ) {
        return
      }

      setShoppingList([
        ...shoppingList,
        {
          itemID: parseInt(itemID, 10),
          name,
          ...FORM_DEFAULTS
        }
      ])
    },
    [shoppingList, disableList]
  )

  const hideResultsTable = shoppingList.length === 0

  return (
    <SmallFormContainer
      onClick={() => {}}
      title="Shopping list generator"
      loading={loading}
      hideSubmitButton={hideResultsTable}
      error={error}>
      <div className="py-2 flex flex-col max-w-md">
        <TitleTooltip
          title="Find Items"
          toolTip="Add up to 10 items to find crafting ingredients for"
          relative
        />
        <DebouncedSelectInput
          id="shopping-list-search"
          selectOptions={ffxivItemsList}
          formName={'shoppingList'}
          onSelect={handleSelect}
          error={error}
          placeholder="Search items..."
          disabled={disableList}
        />
      </div>
      {!hideResultsTable && (
        <div className="max-w-full overflow-x-scroll">
          <table className="min-w-full my-4 px-1 text-gray-800 dark:text-gray-100 border-t border-separate border-spacing-y-2">
            <thead className="mt-4 py-4">
              <tr>
                <TableHead>Item</TableHead>
                <TableHead>Craft Amount</TableHead>
                <TableHead>High Quality</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Remove Item</TableHead>
              </tr>
            </thead>
            <tbody>
              {shoppingList.map((item, index) => {
                return (
                  <Row
                    key={`${index}-${item.itemID}`}
                    error={!!error && error.includes(item.itemID.toString())}
                    {...item}
                    updateRow={(newForm) => {
                      const newList = shoppingList.map((row) => {
                        return newForm.itemID === row.itemID && row !== newForm
                          ? newForm
                          : row
                      })
                      setShoppingList(newList)
                    }}
                    onClick={(id) => {
                      setShoppingList(
                        shoppingList.filter(
                          (listItem) => listItem.itemID !== id
                        )
                      )
                    }}
                  />
                )
              })}
            </tbody>
            <input
              hidden
              readOnly
              name={FORM_NAME}
              value={JSON.stringify(shoppingList)}
            />
          </table>
        </div>
      )}
    </SmallFormContainer>
  )
}
