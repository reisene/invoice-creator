'use client';

import { useActionState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  Form,
  Row,
} from 'react-bootstrap';
import { createTaxParamAction } from './actions';

const initialState = {
  ok: false,
  message: '',
};

export default function TaxParamForm() {
  const [state, formAction, pending] = useActionState(
    createTaxParamAction,
    initialState,
  );

  return (
    <Card className={'border-secondary-subtle shadow-sm mb-4'}>
      <CardBody>
        <CardTitle className={'h4 mb-3'}>Dodaj parametry podatkowe</CardTitle>

        {state.message ? (
          <Alert variant={state.ok ? 'success' : 'danger'} className={'mb-3'}>
            {' '}
            {state.message}
          </Alert>
        ) : null}
        <Form action={formAction}>
          <Row className={'g-3'}>
            <Col md={4}>
              <Form.Group controlId={'year'}>
                <Form.Label>Rok</Form.Label>
                <Form.Control
                  type={'number'}
                  name={'year'}
                  min={2000}
                  max={2100}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId={'pensionRate'}>
                <Form.Label>Stawka emerytalna</Form.Label>
                <Form.Control
                  type={'number'}
                  name={'pensionRate'}
                  step={'0.0001'}
                  defaultValue={'0.0976'}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='rentRate'>
                <Form.Label>Składka rentowa</Form.Label>
                <Form.Control
                  name='rentRate'
                  type='number'
                  step='0.0001'
                  defaultValue='0.015'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='sicknessRate'>
                <Form.Label>Składka chorobowa</Form.Label>
                <Form.Control
                  name='sicknessRate'
                  type='number'
                  step='0.0001'
                  defaultValue='0.0245'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='healthRate'>
                <Form.Label>Składka zdrowotna</Form.Label>
                <Form.Control
                  name='healthRate'
                  type='number'
                  step='0.0001'
                  defaultValue='0.09'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='taxRate1'>
                <Form.Label>Podatek I próg</Form.Label>
                <Form.Control
                  name='taxRate1'
                  type='number'
                  step='0.0001'
                  defaultValue='0.12'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='taxRate2'>
                <Form.Label>Podatek II próg</Form.Label>
                <Form.Control
                  name='taxRate2'
                  type='number'
                  step='0.0001'
                  defaultValue='0.32'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='taxThreshold'>
                <Form.Label>Próg podatkowy</Form.Label>
                <Form.Control
                  name='taxThreshold'
                  type='number'
                  step='0.01'
                  defaultValue='120000'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='monthlyTaxReduction'>
                <Form.Label>Miesięczna kwota zmniejszająca</Form.Label>
                <Form.Control
                  name='monthlyTaxReduction'
                  type='number'
                  step='0.01'
                  defaultValue='300'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='yearlyYoungReliefLimit'>
                <Form.Label>Limit ulgi dla młodych</Form.Label>
                <Form.Control
                  name='yearlyYoungReliefLimit'
                  type='number'
                  step='0.01'
                  defaultValue='85528'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='zusLimitMultiple'>
                <Form.Label>Wielokrotność limitu ZUS</Form.Label>
                <Form.Control
                  name='zusLimitMultiple'
                  type='number'
                  defaultValue='30'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='minimumWage'>
                <Form.Label>Minimalne wynagrodzenie</Form.Label>
                <Form.Control
                  name='minimumWage'
                  type='number'
                  step='0.01'
                  defaultValue='4300'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='costRateStandard'>
                <Form.Label>Koszty standardowe</Form.Label>
                <Form.Control
                  name='costRateStandard'
                  type='number'
                  step='0.0001'
                  defaultValue='0.2'
                  required
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group controlId='costRateArtistic'>
                <Form.Label>Koszty autorskie</Form.Label>
                <Form.Control
                  name='costRateArtistic'
                  type='number'
                  step='0.0001'
                  defaultValue='0.5'
                  required
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Form.Group controlId='comment'>
                <Form.Label>Komentarz</Form.Label>
                <Form.Control
                  name='comment'
                  as='textarea'
                  rows={3}
                  placeholder='Opcjonalny opis źródła lub powodu zmiany.'
                />
              </Form.Group>
            </Col>

            <Col xs={12}>
              <Button type='submit' disabled={pending}>
                {pending ? 'Zapisywanie…' : 'Dodaj parametry'}
              </Button>
            </Col>
          </Row>
        </Form>
      </CardBody>
    </Card>
  );
}
